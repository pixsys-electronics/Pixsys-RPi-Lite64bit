#!/usr/bin/python3

import redis, subprocess, time, platform, ipaddress, configparser, json, re, glob, os
from collections import OrderedDict

r = redis.Redis(decode_responses=True)

def MAC(iface):
    dev = "/sys/class/net/%s/address" % iface
    return open(dev,"r").read().strip().upper().replace(":", "")

def IFACE(mac):
    if mac:
        for dev in glob.glob("/sys/class/net/*"):
            iface = dev.split('/')[-1]
            if iface == "lo":
                continue
            if mac == MAC(iface):
                return iface
    return None

def split(text):
    return [line.strip().split() for line in text.splitlines()]

def run(command, splitted=True):
    p = subprocess.run(command.split(), capture_output=True, text=True, shell=False)
    return splitted and split(p.stdout) or p.stdout

def who_are_you(sender, iface, dest, *args):
    name   = open("/etc/hostname", "r").read().strip()
    uname  = platform.uname()
    veros  = " ".join([uname.system, uname.version])
    serno  = "???"
    try:
        ini = configparser.ConfigParser()
        ini.read("/etc/device.info")
        cfg = ini["Pixsys"]
        serno = cfg["Serial number"]
    except:
        pass
    try:
        ini = configparser.ConfigParser()
        ini.read("/etc/pixsys.info")
        cfg = ini["Pixsys"]
        #veros = "%s_%s_Rev.%s" % (cfg["Image flavour"], serno, cfg["Git commit"])
        veros = "%s_%s" % (cfg["Image flavour"], serno)
    except:
        pass
    rootpart = run("findmnt / -o source -n")[0][0]
    if rootpart == "/dev/mmcblk0p1":
        veros += "-SD"
    veros += "_%s" % iface
    memory = "0"
    for line in split(open("/proc/meminfo").read()):
        if line[0] == "MemAvailable:":
            memory = str(int(line[1]))
            #memory = str(int(line[1])*1024)
    answer = " ,".join(["FOUND_BRO ", name, veros, MAC(iface), time.strftime("%m/%d/%Y %H:%M:%S"), "OK, :"+memory])
    return answer

def get_ip(sender, iface, dest, mac, *args):
    iface = IFACE(mac.upper())
    if iface:
        dip_dhcp = "0"
        dip_ip   = "0"
        rotary   = "0"
        if iface == "eth0":
            try:
                state    = r.hgetall("state")
                dip_dhcp = state["DHCP"]
                dip_ip   = state["ADDRESS"]
                rotary   = state["ROTARY"]
            except:
                rotary = "999"
        address = ""
        netmask = ""
        gateway = ""
        namesrv = ""
        dhcp    = "0"
        for line in run("ip addr show dev %s" % iface):
            if line[0] == "inet":
                if_data = ipaddress.ip_interface(line[1])
                address = str(if_data.ip)
                netmask = str(if_data.netmask)
                break
        for line in run("ip route show default dev %s" % iface):
            if line[:2] == ["default", "via"]:
                gateway = line[2]
                break
        for line in split(open("/etc/resolv.conf").read()):
            if line[0] == "nameserver":
                namesrv = line[1]
                break
        for line in run("pgrep -a udhcp"):
            if iface in line:
                dhcp = "1"
                break
        answer = ",".join(["RGETIP", MAC(iface), dip_dhcp, dip_ip, rotary, address, netmask, gateway, namesrv, dhcp, iface])
        return answer

def set_ip(sender, iface, dest, mac, config, *args):
    if mac.upper() == MAC(iface):
        dip_dhcp = False
        dip_ip   = False
        if iface == "eth0":
            try:
                state    = r.hgetall("state")
                dip_dhcp = int(state["DHCP"]) and True or False
                dip_ip   = int(state["ADDRESS"]) and True or False
            except:
                pass
        try:
            (req_iface, dhcp, address, netmask, gateway, dns, hostname) = config.strip().splitlines()
            dhcp = str(dhcp).upper() in ["1", "ON"] and 1 or 0
            try:
                ipaddr = str(ipaddress.ip_interface("%s/%s" % (address, netmask)))
            except:
                ipaddr = ""
            if not dhcp and not ipaddr:
                raise Exception("Invalid configuration, aborting.")
            try:
                gateway = str(ipaddress.IPv4Address(gateway))
            except:
                gateway = ""
            try:
                dns = str(ipaddress.IPv4Address(dns))
            except:
                dns = ""
            if req_iface != "eth0" or (not dip_dhcp and not dip_ip):
                finder = {
                        "ADDRESS": ipaddr,
                        "INTERFACE": req_iface,
                        "DHCP": dhcp,
                        "GATEWAY": gateway,
                        "NAMESERVER": dns,
                        "HOSTNAME": hostname,
                        }
                print(finder)
                current_name = open("/etc/hostname", "r").read().strip()
                if current_name != hostname:
                    rex = re.compile(r"\b%s\b" % current_name)
                    hosts = open("/etc/hosts", "r").readlines()
                    with open("/etc/hosts", "w") as f:
                        for line in hosts:
                            f.write(rex.sub(hostname, line))
                    with open("/etc/hostname", "w") as f:
                        f.write(hostname)
                    run("hostname -F /etc/hostname")
                r.hmset("finder.%s" % req_iface, finder)
                r.publish("state", json.dumps({ "FINDER": { "new": True }}))
                if req_iface != "eth0":
                    try:
                        iface_up = open("/run/network/ifstate.%s" % req_iface, "r").read().strip()
                    except:
                        iface_up = False
                    if iface_up:
                        subprocess.run(["ifdown", req_iface])
                    with open("/etc/network/interfaces.d/%s" % req_iface, "w") as f:
                        output = ["allow-hotplug %s" % req_iface]
                        if dhcp:
                            output.append("iface %s inet dhcp" % req_iface)
                        else:
                            output.append("iface %s inet static" % req_iface)
                            output.append("    address %s" % ipaddr)
                            if gateway:
                                output.append("    gateway %s" % gateway)
                            if dns:
                                output.append("    dns-nameserver %s" % dns)
                        f.write("\n".join(output))
                        f.write("\n")
                    subprocess.run(["ifup", req_iface])

        except Exception as e:
            print("ERROR: %s" % e)

def xmas_tree(sender, iface, dest, mac, state, *args):
    if mac.upper() == MAC(iface):
        if state == "1":
            r.set("SIGNAL", "XMASTREE", ex=60)
        elif state == "0":
            r.delete("SIGNAL")

def reset(sender, iface, dest, mac=None, *args):
    if dest != "255.255.255.255" or mac and mac.upper() == MAC(iface):
        run("reboot")

def set_time(sender, iface, dest, *args):
    if dest != "255.255.255.255" and len(args) == 8:
        h, m, s, day, mo, year, tz, dst = [ int(a) for a in args[:6] ] + list(args[6:])
        if tz[0] not in ("+","-"):
            tz = "+" + tz
        run("date --set='{:04d}-{:02d}-{:02d}T{:02d}:{:02d}:{:02d}{}'".format(year, day, mo, h, m, s, tz))
        run("hwclock -w")

def start_service(sender, iface, dest, service, *args):
    if dest != "255.255.255.255":
        run("systemctl start %s" % service)

def stop_service(sender, iface, dest, service, *args):
    if dest != "255.255.255.255":
        run("systemctl stop %s" % service)

def sd_to_emmc(sender, iface, dest, *args):
    mac = len(args) and args[0] or ""
    if dest != "255.255.255.255" or mac.upper() == MAC(iface):
        run("/opt/backup/uboot/copy2emmc.sh")

def set_wlan(sender, iface, dest, mac, *args):
    if mac.upper() == MAC(iface):
        json_config = ",".join(args)
        try:
            config = json.loads(json_config)
        except:
            config = {}
        req_iface = config.get("NetworkInterface","")
        # ensure req_iface has wireless capabilities
        try:
            assert run("iwconfig %s" % req_iface), "%s has no wireless capabilities" % req_iface
        except Exception as e:
            print("ERROR: %s" % e)
            return
        if req_iface:
            try:
                ipaddr = str(ipaddress.ip_interface("%s/%s" % (config["Address"], config["NetMask"])))
            except:
                ipaddr = None
            output_files = []
            mode = config.get("Mode", "")
            if mode == "AP":
                if not ipaddr:
                    # AP mode needs an address, if it is missing we bail out
                    # TODO: couldn't we provide a default value, instead?
                    print("ERROR: missing or invalid address/netmask in AP mode")
                    return
                try:
                    dhcp_range = ",".join([str(ipaddress.IPv4Address(config[k])) for k in ["DHCPStart", "DHCPEnd"]])
                    #TODO: do we need to test if range is valid and belongs to the same network of ipaddr?
                except:
                    dhcp_range = None
                output_files.append(("/etc/hostapd/hostapd-%s.conf" % req_iface, [
                    "interface=%s" % req_iface,
                    "driver=nl80211",
                    "hw_mode=g",
                    "ieee80211n=1",
                    "wmm_enabled=1",
                    "country_code=%s" % config.get("Country", "IT"),
                    "auth_algs=1",
                    "wpa=2",
                    "wpa_key_mgmt=WPA-PSK",
                    "wpa_pairwise=CCMP",
                    "channel=%s" % config.get("Channel", "1"),
                    "ssid=%s" % config.get("SSID", open("/etc/hostname","r").read().strip()),
                    "wpa_passphrase=%s" % config.get("Password","1234567890"),
                ]))
                iface_config = [
                    "allow-hotplug %s" % req_iface,
                    "iface %s inet static" % req_iface,
                    "   address %s" % ipaddr,
                    "   hostapd /etc/hostapd/hostapd-%s.conf" % req_iface,
                ]
                if dhcp_range:
                    iface_config += [
                        "   up dnsmasq --interface=%s --pid-file=/var/run/dnsmasq-%s.pid --dhcp-range=%s" % (req_iface, req_iface, dhcp_range),
                        "   down kill $(cat /var/run/dnsmasq-%s.pid)" % req_iface,
                    ]
                output_files.append(("/etc/network/interfaces.d/%s" % req_iface, iface_config))
            elif mode == "client":
                try:
                    ssid = config["SSID"]
                    psk  = run("wpa_passphrase %s %s" % (ssid, config["Password"]))[3][0].split("=")[1]
                    assert len(psk) == 64, "Invalid psk"
                except Exception as e:
                    print("ERROR: %s" % e)
                    return
                iface_config = [ "allow-hotplug %s" % req_iface ]
                if ipaddr:
                    iface_config += [
                        "iface %s inet static" % req_iface,
                        "   address %s" % ipaddr,
                    ]
                else:
                    iface_config += [ "%s inet dhcp" % req_iface ]
                iface_config += [
                    "   wpa-ssid %s" % ssid,
                    "   wpa-psk %s" % psk,
                ]
                output_files.append(("/etc/network/interfaces.d/%s" % req_iface, iface_config))
            if output_files:
                try:
                    iface_up = open("/run/network/ifstate.%s" % req_iface, "r").read().strip()
                except:
                    iface_up = False
                if iface_up:
                    subprocess.run(["ifdown", req_iface])
                for fname, contents in output_files:
                    open(fname, 'w').write("\n".join(contents))
                subprocess.run(["ifup", req_iface])

def get_netstat(sender, iface, dest, mac, *args):
    iface = IFACE(mac.upper())
    if iface:
        netstat = {}
        netstat['interfaces'] = json.loads(run("ip --json --stats address", False))
        netstat['routes'] = json.loads(run("ip --json route", False))
        try:
            state    = r.hgetall("state")
            netstat['dip'] = { k.lower(): state.get(k,"") for k in ["DHCP", "ADDRESS", "ROTARY"] }
        except:
            pass
        for ifdata in netstat['interfaces']:
            ifdata['config'] = OrderedDict([ line.split(":",1) for line in run("ifquery %s" % ifdata['ifname'], False).splitlines() ])
            wlan_cfg = "/etc/hostapd/hostapd-%s.conf" % ifdata["ifname"]
            if os.path.isfile(wlan_cfg):
                ifdata['config']["wifi-mode"] = "AP"
                with open(wlan_cfg, "r") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and line[0] != "#":
                            k, v = line.split("=",1)
                            if k in ["country_code", "channel", "ssid", "wpa_passphrase"]:
                                ifdata['config'][k] = v
        answer = "RNETSTAT,%s" % json.dumps(netstat)
        return answer
