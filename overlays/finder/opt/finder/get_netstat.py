#!/usr/bin/python3

import sys
from commands import MAC, get_netstat
iface = 'eth0'
if len(sys.argv) >= 2:
    iface = sys.argv[1]
print(get_netstat(None, iface, '', MAC(iface)))
