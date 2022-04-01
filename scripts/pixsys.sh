#!/bin/bash

useradd -m -s /bin/bash pixsys
echo "pixsys:123456" | chpasswd
adduser pixsys sudo

addgroup plc
adduser pixsys plc

#mkdir -p /data/usr
#chgrp -R plc /data/usr
#chmod g+rwxs /data/usr
