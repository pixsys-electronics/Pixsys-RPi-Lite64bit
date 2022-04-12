import time
from rpi_hardware_pwm import HardwarePWM

pwm = HardwarePWM(pwm_channel=1, hz=4000)
pwm.start(100) # full duty cycle
#time.sleep(1)
pwm.change_duty_cycle(50)
time.sleep(1)
pwm.change_frequency(1_000)
time.sleep(.3)
pwm.change_frequency(2_000)
time.sleep(.3)
pwm.change_frequency(3_000)
time.sleep(.3)
pwm.change_frequency(4_000)
time.sleep(1)
pwm.stop()
