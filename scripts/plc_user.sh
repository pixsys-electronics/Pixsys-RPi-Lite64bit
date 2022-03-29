#!/bin/bash

user=$1
if [ -z $user ]; then
  user=PL500
fi

useradd --home-dir /data/ \
        --shell /bin/false \
        $user

echo "$user:123456" | chpasswd
adduser $user plc

mkdir -p /data/plc
chown -R $user:plc /data/plc/
chmod g+rwxs /data/plc/

perl -i -pe's{(^Subsystem\s+sftp.*)}{#$1}' /etc/ssh/sshd_config
cat >>/etc/ssh/sshd_config <<EOF

Subsystem   sftp    internal-sftp
Match user $user
    ChrootDirectory /data/
    X11Forwarding no
    AllowTcpForwarding no
    PermitTunnel no
    AllowAgentForwarding no
    ForceCommand internal-sftp
EOF
