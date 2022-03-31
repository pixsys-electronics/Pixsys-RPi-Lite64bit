#!/bin/bash

if [ -z $ROOTDIR ]; then
  echo "ROOTDIR is undefined, quitting."
  exit 1
fi

if [ -z $BACKUPDIR ]; then
  echo "BACKUPDIR is undefined, quitting."
  exit 1
fi

FLAVOUR=$(crudini --get /etc/pixsys.info Pixsys "Image flavour")
SERIAL=$(crudini --get /etc/device.info Pixsys "Serial number")
MAC=$(tr -d : < /sys/class/net/eth0/address)
BASENAME=${FLAVOUR}_${SERIAL}_${MAC}

case "$1" in
  backup)
    if [ ! -f ${ROOTDIR}/data/PixsysPortal/linux-arm/.device.env ]; then
      echo "PixsysPortal licence not found at '${ROOTDIR}/data/PixsysPortal/linux-arm/.device.env', quitting."
      exit 1
    fi
    tar zcvf ${BACKUPDIR}/${BASENAME}_pixsysportal-lic_$(date +"%Y%m%d_%H%M%S").tgz \
      -C $ROOTDIR \
      data/PixsysPortal/linux-arm/.device.env
    ;;
  restore)
    last_backup=$(find $BACKUPDIR -type f -name ${BASENAME}_pixsysportal-lic_\*.tgz 2>/dev/null | sort -r | head -1)
    if [ -z $last_backup ]; then
      echo "No backup named '${BACKUPDIR}/${BASENAME}_pixsysportal-lic_*.tgz' found, quitting."
      exit 1
    fi
    tar xvf $last_backup -C $ROOTDIR
    ;;
  *)
    echo "Usage: `basename $0` (backup | restore)"
    exit 1
    ;;
esac
