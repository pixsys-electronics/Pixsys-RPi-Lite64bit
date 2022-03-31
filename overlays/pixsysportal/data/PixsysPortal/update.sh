#!/bin/bash -e

cd $(dirname $(realpath $0))
rm -f linux-arm.zip
wget https://releases.portal.pixsys.net/o20010/04/linux-arm/linux-arm.zip
unzip -o linux-arm.zip
rm -f linux-arm.zip
