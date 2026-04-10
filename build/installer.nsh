!macro customCheckAppRunning
  ; Kill DYR silently — this REPLACES the default "app cannot be closed" dialog
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 2000
  ; Second kill for stubborn processes
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 1000
!macroend

!macro customInit
  ; Kill DYR silently on installer start
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 2000
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 1000

  ; Silently run existing uninstaller if present (clean reinstall)
  IfFileExists "$INSTDIR\Uninstall DYR.exe" 0 skipUninstall
    nsExec::ExecToStack '"$INSTDIR\Uninstall DYR.exe" /S --force-run'
    Pop $R0
    Pop $R1
    Sleep 3000
  skipUninstall:
!macroend

!macro customInstall
  DetailPrint "Installation complete."
!macroend

!macro customUnInstall
  ; Kill the app silently before uninstall
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 2000
  nsExec::ExecToStack '"$SYSDIR\taskkill.exe" /F /IM "DYR.exe" /T'
  Pop $R0
  Pop $R1
  Sleep 500
!macroend
