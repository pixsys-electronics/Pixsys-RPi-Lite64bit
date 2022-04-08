#!/bin/bash

KERNEL=kernel7l
KERNELSOURCE=~/WP830/linux
OVERLAYPATH=~/Pixsys-RPi/overlays/kernel


cd $KERNELSOURCE
env PATH=$PATH make ARCH=arm CROSS_COMPILE=arm-linux-gnueabihf- INSTALL_MOD_PATH=$OVERLAYPATH modules_install
cp -fv $KERNELSOURCE/arch/arm/boot/zImage $OVERLAYPATH/boot/$KERNEL.img
cp -fv $KERNELSOURCE/arch/arm/boot/dts/*.dtb $OVERLAYPATH/boot/
cp -fv $KERNELSOURCE/arch/arm/boot/dts/overlays/*.dtb* $OVERLAYPATH/boot/overlays/
cp -fv $KERNELSOURCE/arch/arm/boot/dts/overlays/README $OVERLAYPATH/boot/overlays/
