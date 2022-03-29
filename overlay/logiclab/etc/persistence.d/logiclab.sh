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
    if [ ! -f ${ROOTDIR}/data/plc/LLExec.key ]; then
      echo "LogicLab key file not found at '${ROOTDIR}/data/plc/LLExec.key', quitting."
      exit 1
    fi
    cp ${ROOTDIR}/data/plc/LLExec.key ${BACKUPDIR}/${BASENAME}_logiclab-LLExec_$(date +"%Y%m%d_%H%M%S").key
    ;;
  restore)
    last_backup=$(find $BACKUPDIR -type f -name ${BASENAME}_logiclab-LLExec_\*.key 2>/dev/null | sort -r | head -1)
    if [ -z $last_backup ]; then
      echo "No backup named '${BACKUPDIR}/${BASENAME}_logiclab-LLExec_*.key' found, quitting."
      exit 1
    fi
    cp $last_backup $ROOTDIR/data/plc/LLExec.key
    ;;
  *)
    echo "Usage: `basename $0` (backup | restore)"
    exit 1
    ;;
esac
