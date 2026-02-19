!macro customInstall
  DetailPrint "Preserving KLMS Data Layer..."
  CreateDirectory "$APPDATA\KLMS"
  DetailPrint "Safe Installation Initialized."
!macroend

!macro customUnInstall
  DetailPrint "Uninstalling KLMS Application..."
  DetailPrint "NOTE: Database and Logs in $APPDATA\KLMS were preserved."
!macroend
