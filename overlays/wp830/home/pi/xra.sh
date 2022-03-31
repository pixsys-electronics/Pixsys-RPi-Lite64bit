#!/bin/bash

echo -n "HDMI-A-1:1366x768.bin" > /sys/module/drm/parameters/edid_firmware

systemctl stop lightdm.service
systemctl start lightdm.service

echo "Execute:"
echo "export XAUTHORITY=/var/run/lightdm/root/\:0"
echo "export DISPLAY=:0"
echo "xrandr"
