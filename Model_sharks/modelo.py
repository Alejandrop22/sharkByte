# Instalación automática de librerías necesarias
import subprocess
import sys

def install_if_missing(package, pip_name=None):
    try:
        __import__(package)
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name or package])

required_packages = {
    "pandas": "pandas",
    "numpy": "numpy",
    "sklearn": "scikit-learn"
}

for pkg, pip_name in required_packages.items():
    install_if_missing(pkg, pip_name)

# Importación de librerías
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

print("Este script revisa el el dataset seguimiento_con_datos_ambientales.csv y predice la siguiente poscicion de el tiburon, la entrada es el id del tiburon y la latitud y longitud actual.")
print("Este escript regresa la siguiente latitud y longitud esperada en 6 horas.")
print("estos son los id's de los tiburones con menos error: 159826      120880      132414     129957     169320     132416     146598     151420     160314     120885")

# Carga y limpieza de datos
df = pd.read_csv("seguimiento_con_datos_ambientales.csv")
for col in ["SST_asignado", "Clorofila_asignada"]:
    df[col] = pd.to_numeric(df[col], errors="coerce")
df = df.dropna(subset=["SST_asignado", "Clorofila_asignada"])
df["datetime"] = pd.to_datetime(df["datetime"], errors="coerce")
df = df.dropna(subset=["datetime"])
df = df.sort_values(["ID", "datetime"]).reset_index(drop=True)

# Re-muestreo a intervalos regulares de 6 horas por tiburón
df_uniform = (
    df.groupby("ID")
    .apply(lambda g: g.set_index("datetime")
           .resample("6H")
           .interpolate(method="linear")
           .reset_index())
    .reset_index(drop=True)
)

# Variables auxiliares
df_uniform["hour"] = df_uniform["datetime"].dt.hour
df_uniform["Mes"] = df_uniform["datetime"].dt.month

# Crear variables futuras (exactamente 6 h adelante)
df_uniform["lat_next"] = df_uniform.groupby("ID")["Lat"].shift(-1)
df_uniform["lon_next"] = df_uniform.groupby("ID")["Lon"].shift(-1)
df_uniform["sst_next"] = df_uniform.groupby("ID")["SST_asignado"].shift(-1)
df_uniform["chl_next"] = df_uniform.groupby("ID")["Clorofila_asignada"].shift(-1)
df_uniform = df_uniform.dropna(subset=["lat_next", "lon_next", "sst_next", "chl_next"])

# Entrenamiento de modelos
models_move = {}
models_env = {}
errors_df = []

for shark_id, group in df_uniform.groupby("ID"):
    if len(group) < 10:
        continue
    group = group.sort_values("datetime")
    split = int(len(group) * 0.8)
    train_df = group.iloc[:split]
    test_df = group.iloc[split:]

    # Modelo de movimiento
    X_train_move = train_df[["Lat", "Lon", "SST_asignado", "Clorofila_asignada", "hour", "Mes"]]
    y_train_move = train_df[["lat_next", "lon_next"]]
    X_test_move = test_df[["Lat", "Lon", "SST_asignado", "Clorofila_asignada", "hour", "Mes"]]
    y_test_move = test_df[["lat_next", "lon_next"]]

    move_model = RandomForestRegressor(
        n_estimators=600, max_depth=25, min_samples_split=2,
        min_samples_leaf=2, random_state=42
    )
    move_model.fit(X_train_move, y_train_move)

    # Modelo ambiental
    X_train_env = train_df[["lat_next", "lon_next", "hour", "Mes"]]
    y_train_env = train_df[["sst_next", "chl_next"]]
    X_test_env = test_df[["lat_next", "lon_next", "hour", "Mes"]]
    y_test_env = test_df[["sst_next", "chl_next"]]

    env_model = RandomForestRegressor(
        n_estimators=300, max_depth=20, random_state=42
    )
    env_model.fit(X_train_env, y_train_env)

    models_move[shark_id] = move_model
    models_env[shark_id] = env_model

    # Evaluación
    pred_move = move_model.predict(X_test_move)
    error_pos = np.sqrt(
        (y_test_move["lat_next"].values - pred_move[:, 0])**2 +
        (y_test_move["lon_next"].values - pred_move[:, 1])**2
    ) * 111

    pred_env = env_model.predict(X_test_env)
    error_sst = np.abs(y_test_env["sst_next"].values - pred_env[:, 0]).mean()
    error_chl = np.abs(y_test_env["chl_next"].values - pred_env[:, 1]).mean()

    errors_df.append({
        "ID": shark_id,
        "Error_pos_km": error_pos.mean(),
        "Error_temp_C": error_sst,
        "Error_chl_mg": error_chl
    })

errors_df = pd.DataFrame(errors_df)

# Predicción interactiva
id_input = input("ID del tiburón: ").strip()
if id_input not in models_move and id_input.isdigit():
    id_input = int(id_input)
if id_input not in models_move:
    print(f"No existe modelo entrenado para el ID '{id_input}'.")
    exit()

lat = float(input("Latitud actual: "))
lon = float(input("Longitud actual: "))
hour = int(input("Hora actual (0-23): "))
month = int(input("Mes actual (1-12): "))

move_model = models_move[id_input]
env_model = models_env[id_input]

df_id = df_uniform[df_uniform["ID"] == id_input]
nearest = df_id.iloc[(df_id["Lat"] - lat).abs().argsort()[:1]]
sst_current = nearest["SST_asignado"].values[0]
chl_current = nearest["Clorofila_asignada"].values[0]

X_pred_move = pd.DataFrame([[lat, lon, sst_current, chl_current, hour, month]],
                           columns=["Lat", "Lon", "SST_asignado", "Clorofila_asignada", "hour", "Mes"])
lat_next, lon_next = move_model.predict(X_pred_move)[0]

X_pred_env = pd.DataFrame([[lat_next, lon_next, hour, month]],
                          columns=["lat_next", "lon_next", "hour", "Mes"])
sst_next, chl_next = env_model.predict(X_pred_env)[0]

# Resultados
print("\nRESULTADO DE PREDICCIÓN:")
print(f"Tiburón: {id_input}")
print(f"Siguiente Latitud: {lat_next:.4f}")
print(f"Siguiente Longitud: {lon_next:.4f}")
print(f"Temperatura esperada (SST): {sst_next:.2f} °C")
print(f"Clorofila esperada (CHL): {chl_next:.3f} mg/m³")
print("Predicción equivalente a 6 horas en el futuro.")

err = errors_df.loc[errors_df["ID"] == id_input]
if err.empty and isinstance(id_input, int):
    err = errors_df.loc[errors_df["ID"] == int(id_input)]
if not err.empty:
    e = err.iloc[0]
    print("\nError del modelo para este tiburón:")
    print(f"Error posición: {e['Error_pos_km']:.2f} km")
    print(f"Error temperatura:{e['Error_temp_C']:.2f} °C")
    print(f"Error clorofila: {e['Error_chl_mg']:.3f} mg/m³")
else:
    print("\nNo se encontró información de error para este tiburón.")