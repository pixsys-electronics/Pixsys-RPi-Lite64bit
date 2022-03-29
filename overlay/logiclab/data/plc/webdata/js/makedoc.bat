@echo off
setlocal
pushd %~dp0

set OUTZIP=%1
if '%OUTZIP%'=='' set OUTZIP=API_html.zip

echo Build Documentation ...

if '%ZIP_EXE%'=='' set ZIP_EXE="C:\Program Files (x86)\GNUWin32\bin\zip.exe"

call jsdoc -c jsdoc.conf LLWebServer.js -t %APPDATA%\npm\node_modules\docdash


if exist %OUTZIP% del %OUTZIP%

%ZIP_EXE% -9 -r %OUTZIP% docs

popd
echo Done !
pause
