#!/bin/bash

arch=$1
suite=$2
board=$3
flavour=$4
kernel=$5
commit=$6

cat >/etc/pixsys.info <<EOF
[Pixsys]
Architecture   = $arch
Debian suite   = $suite
Board          = $board
Image flavour  = $flavour
Kernel version = $kernel
Git commit     = $commit
EOF
chmod -w /etc/pixsys.info
