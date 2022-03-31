#!/usr/bin/python3 -u

import socket, struct, ipaddress
import commands

class Finder:
    def __init__(self, port=12346, bufsize=255, debug=False):
        self.port    = port
        self.bufsize = bufsize
        self.debug   = debug
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        # add option for IP header
        # Python3 bug: socket does not define IP_PKTINFO
        # https://bugs.python.org/issue31203
        socket.IP_PKTINFO = 8
        self._sock.setsockopt(socket.IPPROTO_IP, socket.IP_PKTINFO, 1)
        self._sock.bind(("0.0.0.0", self.port))
    def __del__(self):
        try:
            self._sock.close()
        except:
            pass
    def read(self):
        # data, sender = self._sock.recvfrom(self.bufsize)
        data, ancdata, flags, sender = self._sock.recvmsg(self.bufsize, socket.CMSG_LEN(16))
        iface = "eth0"
        dest = "255.255.255.255"
        addr = "255.255.255.255"
        for cmsg_level, cmsg_type, cmsg_data in ancdata:
            if cmsg_level == socket.IPPROTO_IP and cmsg_type == socket.IP_PKTINFO:
                """
                /* Structure used for IP_PKTINFO.  */
                struct in_pktinfo
                  {
                    int ipi_ifindex;                /* Interface index  */
                    struct in_addr ipi_spec_dst;    /* Routing destination address  */
                    struct in_addr ipi_addr;        /* Header destination address  */
                  };
                """
                iface_no, final_addr, dest_addr = struct.unpack("i4s4s", cmsg_data)
                iface = socket.if_indextoname(iface_no)
                dest  = str(ipaddress.IPv4Address(dest_addr))
                final = str(ipaddress.IPv4Address(final_addr))
        # we expect data to be UTF16 encoded
        data = data.decode("UTF16")
        if self.debug:
            print("<", sender, iface, dest, final, data)
        command, *args = data.split(",")
        return (sender[0], iface, dest, command, args)
    def send(self, data, iface, dest):
        receiver = (dest, self.port)
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_BINDTODEVICE, iface.encode("ascii"))
        s.sendto(data.encode("UTF16"), receiver)
        if self.debug:
            print(">", receiver, data)
    def do(self, sender, iface, dest, command, args):
        func = self.commands.get(command, None)
        if func:
            return func(sender, iface, dest, *args)
        return None
    @property
    def commands(self):
        return {
            "WHOAREYOU:": commands.who_are_you,
            "FIND____?:": commands.who_are_you,
            "TIME*****:": commands.set_time,
            "RUN******:": commands.start_service,
            "KILL*****:": commands.stop_service,
            "RESET****:": commands.reset,
            "RESETM***:": commands.reset,
            "LAN>CAN0*:": None,
            "LAN>CAN1*:": None,
            "SETMAC***:": None,
            "SETIP****:": commands.set_ip,
            "GETIP****:": commands.get_ip,
            "LOGPLC***:": None,
            "XMASTREE*:": commands.xmas_tree,
            "SD>EMMC**:": commands.sd_to_emmc,
            "SETWLAN**:": commands.set_wlan,
            "NETSTAT**:": commands.get_netstat,
        }

if __name__ == "__main__":
    try:
        finder = Finder(debug=True)
        while True:
            try:
                sender, iface, dest, command, args = finder.read()
                answer = finder.do(sender, iface, dest, command, args)
                if answer:
                    if dest == "255.255.255.255":
                        # always answer in broadcast to broadcast queries
                        sender = dest
                    finder.send(answer, iface, sender)
            except Exception as e:
                print("ERROR: ", e)
    except KeyboardInterrupt:
        pass
