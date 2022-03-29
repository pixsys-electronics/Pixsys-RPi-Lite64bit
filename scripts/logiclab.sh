#!/bin/bash

apt install -y libvncserver1
apt clean

cd /data/plc
./AlVncConf -p '1234'
mv /data/plc/vnc.auth /data/plc/authVNC
chown PL600:PL600 /data/plc/authVNC

