#!/bin/bash

#commit=$(git describe --always --long)
#[ $(git status --porcelain | wc -l) -gt 0 ] && commit=${commit}-dirty
#
#if [ "x$1" != "xfast" ]; then
#  gocode/bin/debos debian.yaml -t commit:$commit $*
#else
#  shift
#fi
gocode/bin/debos image.yaml -t commit:$commit $*
