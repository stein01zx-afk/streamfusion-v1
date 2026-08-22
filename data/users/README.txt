StreamFusion usa esta carpeta para la base de datos de cuentas:
data/users/streamfusion.db

En Railway, monta un Volume persistente (por ejemplo en /data) y define:
SF_DATA_DIR=/data

Con eso las cuentas, configuraciones y biblioteca personal sobreviven a redeploys y reinicios.
