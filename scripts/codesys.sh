#!/bin/bash

# imposta la password di root
PASS=$1
if [ -z "$PASS" ]; then
  PASS=codesys
fi
echo "root:$PASS" | chpasswd

# abilita l'accesso come root via ssh anche con password
egrep '^\s*PermitRootLogin\s' /etc/ssh/sshd_config >/dev/null
status=$?
if [ $status == 0 ]; then
  perl -i -pe 's/^\s*(PermitRootLogin)\s.*/$1 yes/' /etc/ssh/sshd_config
else
  echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
fi
#systemctl restart ssh

# aggiungi i gruppi "i2c" e "spi"
getent group i2c >/dev/null || addgroup --system i2c
getent group spi >/dev/null || addgroup --system spi

# installa il runtime di codesys
#ln -s ../../data/codesys /var/opt/codesys
apt install -y /root/codesyscontrol*.deb
rm /root/codesyscontrol*.deb
apt clean
#chgrp -R plc /data/codesys
#chmod -R g+rwxs /data/codesys

# disabilita il servizio (sulla eMMC viene attivato in /etc/rc.firstboot)
#systemctl disable codesyscontrol.service

# configurazione CodeSys
perl -i -pe 's/^(Command.0=shutdown)$/$1\nCommand=AllowAll/' /etc/CODESYSControl.cfg

# usa le seriali con nome ttyCOM*
cat >> /etc/CODESYSControl_User.cfg <<EOF

[SysCom]
Linux.Devicefile=/dev/ttyCOM
portnum := COM.SysCom.SYSCOMPORT1;
EOF
