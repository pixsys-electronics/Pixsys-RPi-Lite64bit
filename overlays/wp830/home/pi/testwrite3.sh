#!/bin/bash

value_to_replicate=5
file_length=2048
generated_file="generated.bin"
readed_file="read.bin"
file2k="file2k.bin"

for i in {1..200}
do
	echo "test numeber $i :"

	bash -c "printf ${i}%.0s {1..${file_length}} > $generated_file"
	#bash -c "printf ${value_to_replicate}%.0s {1..${file_length}} > $generated_file"
	#dd if=/dev/random of=$generated_file  bs=2k count=1



	# TRONCO IL FILE a 2K
	dd if=$generated_file  of=$file2k  bs=2k count=1


	# SCRIVO IL FILE da 2K
	cat $file2k > /sys/bus/spi/devices/spi3.0/eeprom
	cat /sys/bus/spi/devices/spi3.0/eeprom > $readed_file

	DIFF=$(diff --color=always $file2k $readed_file)

	if [ "$DIFF" != "" ] 
	then
		echo "###################################################################"
		echo "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ERROR !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
		echo "The directory was modified"
		diff --color=always $file2k $readed_file
		echo "###################################################################"
		echo "###################################################################"
	fi
# DEBUG...
#  	hexdump -C /sys/bus/spi/devices/spi3.0/eeprom	
#	sync
#	sleep 0.1
	rm $file2k
	rm $readed_file
	rm $generated_file
	echo "##### END test #####"
done
