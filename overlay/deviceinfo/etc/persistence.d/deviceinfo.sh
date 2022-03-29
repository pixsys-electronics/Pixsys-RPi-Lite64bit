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
    if [ ! -f ${ROOTDIR}/etc/device.info ]; then
      echo "Device info file not found at '${ROOTDIR}/etc/device.info', quitting."
      exit 1
    fi
    cp ${ROOTDIR}/etc/device.info ${BACKUPDIR}/${BASENAME}_device_$(date +"%Y%m%d_%H%M%S").info
    ;;
  restore)
    last_backup=$(find $BACKUPDIR -type f -name ${BASENAME}_device_\*.info 2>/dev/null | sort -r | head -1)
    if [ -z $last_backup ]; then
      echo "No backup named '${BACKUPDIR}/${BASENAME}_device_*.info' found, quitting."
      exit 1
    fi
    cp $last_backup $ROOTDIR/etc/device.info
    ;;
  *)
    echo "Usage: `basename $0` (backup | restore)"
    exit 1
    ;;
esac
