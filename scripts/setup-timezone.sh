#!/bin/bash

timezone=$1
if [ -z $timezone ]; then
  timezone="Etc/UTC"
fi

tzinfo="/usr/share/zoneinfo/$timezone"
if [ -f "$tzinfo" ]; then
  echo "$timezone" > /etc/timezone
  ln -sf /usr/share/zoneinfo/$timezone /etc/localtime
fi
dpkg-reconfigure -f noninteractive tzdata
