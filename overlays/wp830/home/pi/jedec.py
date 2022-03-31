#!/usr/bin/python

import spidev
spi = spidev.SpiDev()
#spi.mode(0)
spi.open(3,0)
spi.max_speed_hz = 3000000
print(spi.xfer([0x9f, 0, 0, 0]))
