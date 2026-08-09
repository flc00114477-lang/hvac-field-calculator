"use client";

import { useMemo, useState } from "react";

type MoistureMode = "rh" | "wb";
type AirSide = "entering" | "leaving";
type AirflowUnit = "m3s" | "m3h" | "cfm";
type ToolTab = "load" | "air" | "convert";
type AirProperty = "rh" | "wb" | "dp" | "w" | "h";
type ConversionUnit = "mm" | "inch" | "fun";
type ConversionTable = "fractions" | "tools" | "copper";

type FormState = {
  enteringTemp: string;
  enteringMoisture: string;
  leavingTemp: string;
  leavingMoisture: string;
  airflow: string;
  altitude: string;
};

const defaultForm: FormState = {
  enteringTemp: "24",
  enteringMoisture: "60",
  leavingTemp: "14",
  leavingMoisture: "90",
  airflow: "1.4",
  altitude: "0",
};

const airflowLabels: Record<AirflowUnit, string> = {
  m3s: "m³/s",
  m3h: "m³/h",
  cfm: "CFM",
};

const airPropertyOptions: Record<
  AirProperty,
  { label: string; shortLabel: string; unit: string; defaultValue: string }
> = {
  rh: {
    label: "相對濕度",
    shortLabel: "RH",
    unit: "%",
    defaultValue: "60",
  },
  wb: {
    label: "濕球溫度",
    shortLabel: "WB",
    unit: "°C",
    defaultValue: "18.5",
  },
  dp: {
    label: "露點溫度",
    shortLabel: "DP",
    unit: "°C",
    defaultValue: "15.7",
  },
  w: {
    label: "絕對濕度",
    shortLabel: "W",
    unit: "kg/kg",
    defaultValue: "0.0112",
  },
  h: {
    label: "比焓值",
    shortLabel: "h",
    unit: "kJ/kg",
    defaultValue: "52.6",
  },
};

const quickInchFractions = [
  "1/8",
  "3/16",
  "1/4",
  "5/16",
  "3/8",
  "7/16",
  "1/2",
  "9/16",
  "5/8",
  "11/16",
  "3/4",
  "13/16",
  "7/8",
  "15/16",
  "1",
];

const imperialToolSizes = [
  { label: "1/16", inches: 1 / 16 },
  { label: "5/64", inches: 5 / 64 },
  { label: "3/32", inches: 3 / 32 },
  { label: "7/64", inches: 7 / 64 },
  { label: "1/8", inches: 1 / 8 },
  { label: "9/64", inches: 9 / 64 },
  { label: "5/32", inches: 5 / 32 },
  { label: "3/16", inches: 3 / 16 },
  { label: "7/32", inches: 7 / 32 },
  { label: "1/4", inches: 1 / 4 },
  { label: "9/32", inches: 9 / 32 },
  { label: "5/16", inches: 5 / 16 },
  { label: "11/32", inches: 11 / 32 },
  { label: "3/8", inches: 3 / 8 },
  { label: "7/16", inches: 7 / 16 },
  { label: "1/2", inches: 1 / 2 },
  { label: "9/16", inches: 9 / 16 },
  { label: "5/8", inches: 5 / 8 },
  { label: "11/16", inches: 11 / 16 },
  { label: "3/4", inches: 3 / 4 },
  { label: "13/16", inches: 13 / 16 },
  { label: "7/8", inches: 7 / 8 },
  { label: "15/16", inches: 15 / 16 },
  { label: "1", inches: 1 },
  { label: "1 1/16", inches: 1 + 1 / 16 },
  { label: "1 1/8", inches: 1 + 1 / 8 },
  { label: "1 1/4", inches: 1 + 1 / 4 },
  { label: "1 3/8", inches: 1 + 3 / 8 },
  { label: "1 1/2", inches: 1 + 1 / 2 },
];

const copperTubeSizes = [
  { label: "1/4", inches: 1 / 4 },
  { label: "3/8", inches: 3 / 8 },
  { label: "1/2", inches: 1 / 2 },
  { label: "5/8", inches: 5 / 8 },
  { label: "3/4", inches: 3 / 4 },
  { label: "7/8", inches: 7 / 8 },
  { label: "1", inches: 1 },
  { label: "1 1/8", inches: 1 + 1 / 8 },
  { label: "1 1/4", inches: 1 + 1 / 4 },
  { label: "1 3/8", inches: 1 + 3 / 8 },
  { label: "1 1/2", inches: 1 + 1 / 2 },
  { label: "1 5/8", inches: 1 + 5 / 8 },
  { label: "1 3/4", inches: 1 + 3 / 4 },
  { label: "1 7/8", inches: 1 + 7 / 8 },
  { label: "2", inches: 2 },
];

const standardMetricToolSizes = [
  1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 30, 32, 36, 38,
];

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}

function inchFraction(value: number, denominator = 64) {
  let whole = Math.floor(value);
  let numerator = Math.round((value - whole) * denominator);

  if (numerator === denominator) {
    whole += 1;
    numerator = 0;
  }
  if (numerator === 0) {
    return `${whole}`;
  }

  const divisor = greatestCommonDivisor(numerator, denominator);
  const fraction = `${numerator / divisor}/${denominator / divisor}`;
  return whole > 0 ? `${whole} ${fraction}` : fraction;
}

function parseInchValue(rawValue: string) {
  const value = rawValue
    .trim()
    .replace(/[″"]/g, "")
    .replace(/\s*-\s*/g, " ");
  const mixed = value.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const denominator = Number(mixed[3]);
    return denominator === 0
      ? Number.NaN
      : Number(mixed[1]) + Number(mixed[2]) / denominator;
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0
      ? Number.NaN
      : Number(fraction[1]) / denominator;
  }

  return Number(value);
}

function tradeFunLabel(value: number) {
  const roundedHalf = Math.round(value * 2) / 2;
  if (Math.abs(value - roundedHalf) < 0.01) {
    if (roundedHalf === 0.5) {
      return "半分";
    }
    if (roundedHalf % 1 === 0.5) {
      return `${Math.floor(roundedHalf)}分半`;
    }
    return `${roundedHalf}分`;
  }
  return `${format(value, 2)}分`;
}

function saturationPressure(tempC: number) {
  if (tempC < 0) {
    return (
      0.61115 *
      Math.exp((23.036 - tempC / 333.7) * (tempC / (279.82 + tempC)))
    );
  }
  return (
    0.61121 *
    Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)))
  );
}

function pressureAtAltitude(altitudeM: number) {
  return 101.325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.2559);
}

function humidityRatioFromRh(tempC: number, rh: number, pressureKpa: number) {
  const vapourPressure = (rh / 100) * saturationPressure(tempC);
  return (0.621945 * vapourPressure) / (pressureKpa - vapourPressure);
}

function humidityRatioFromWetBulb(
  dryBulbC: number,
  wetBulbC: number,
  pressureKpa: number,
) {
  const saturationAtWetBulb = saturationPressure(wetBulbC);
  const saturatedRatio =
    (0.621945 * saturationAtWetBulb) /
    (pressureKpa - saturationAtWetBulb);

  if (wetBulbC < 0) {
    return (
      ((2830 - 0.24 * wetBulbC) * saturatedRatio -
        1.006 * (dryBulbC - wetBulbC)) /
      (2830 + 1.86 * dryBulbC - 2.1 * wetBulbC)
    );
  }

  return (
    ((2501 - 2.326 * wetBulbC) * saturatedRatio -
      1.006 * (dryBulbC - wetBulbC)) /
    (2501 + 1.86 * dryBulbC - 4.186 * wetBulbC)
  );
}

function humidityRatioFromDewPoint(dewPointC: number, pressureKpa: number) {
  const vapourPressure = saturationPressure(dewPointC);
  return (0.621945 * vapourPressure) / (pressureKpa - vapourPressure);
}

function relativeHumidity(
  tempC: number,
  humidityRatio: number,
  pressureKpa: number,
) {
  const vapourPressure =
    (pressureKpa * humidityRatio) / (0.621945 + humidityRatio);
  return (vapourPressure / saturationPressure(tempC)) * 100;
}

function dewPointFromHumidityRatio(
  humidityRatio: number,
  pressureKpa: number,
) {
  const targetPressure =
    (pressureKpa * humidityRatio) / (0.621945 + humidityRatio);
  let low = -80;
  let high = 80;

  for (let index = 0; index < 80; index += 1) {
    const middle = (low + high) / 2;
    if (saturationPressure(middle) < targetPressure) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

function wetBulbFromHumidityRatio(
  dryBulbC: number,
  humidityRatio: number,
  pressureKpa: number,
) {
  let low = -80;
  let high = dryBulbC;

  for (let index = 0; index < 80; index += 1) {
    const middle = (low + high) / 2;
    const middleRatio = humidityRatioFromWetBulb(
      dryBulbC,
      middle,
      pressureKpa,
    );
    if (middleRatio < humidityRatio) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return (low + high) / 2;
}

function enthalpy(tempC: number, humidityRatio: number) {
  return 1.006 * tempC + humidityRatio * (2501 + 1.86 * tempC);
}

function specificVolume(
  tempC: number,
  humidityRatio: number,
  pressureKpa: number,
) {
  return (
    (0.287042 *
      (tempC + 273.15) *
      (1 + 1.607858 * humidityRatio)) /
    pressureKpa
  );
}

function format(value: number, digits = 1) {
  const adjustedValue =
    value === 0 ? 0 : value + Math.sign(value) * Number.EPSILON * 1000000;
  return new Intl.NumberFormat("zh-HK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(adjustedValue);
}

function NumberField({
  label,
  value,
  unit,
  step = "0.1",
  onChange,
}: {
  label: string;
  value: string;
  unit: string;
  step?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-control">
        <input
          aria-label={`${label}，單位 ${unit}`}
          inputMode="decimal"
          type="number"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
        />
        <span className="field-unit">{unit}</span>
      </span>
    </label>
  );
}

function AirCard({
  side,
  mode,
  temp,
  moisture,
  onModeChange,
  onTempChange,
  onMoistureChange,
}: {
  side: AirSide;
  mode: MoistureMode;
  temp: string;
  moisture: string;
  onModeChange: (mode: MoistureMode) => void;
  onTempChange: (value: string) => void;
  onMoistureChange: (value: string) => void;
}) {
  const entering = side === "entering";
  const title = entering ? "入風" : "出風";

  return (
    <section className={`air-card ${side}`} aria-labelledby={`${side}-title`}>
      <div className="air-card-header">
        <span className="direction-icon" aria-hidden="true">
          {entering ? "↓" : "↑"}
        </span>
        <div>
          <h2 id={`${side}-title`}>{title}</h2>
          <p>{entering ? "ENTERING AIR" : "LEAVING AIR"}</p>
        </div>
      </div>

      <NumberField
        label="乾球溫度"
        value={temp}
        unit="°C"
        onChange={onTempChange}
      />

      <div className="mode-toggle" aria-label={`${title}濕度輸入方式`}>
        <button
          className={mode === "rh" ? "active" : ""}
          type="button"
          aria-pressed={mode === "rh"}
          onClick={() => onModeChange("rh")}
        >
          相對濕度
        </button>
        <button
          className={mode === "wb" ? "active" : ""}
          type="button"
          aria-pressed={mode === "wb"}
          onClick={() => onModeChange("wb")}
        >
          濕球
        </button>
      </div>

      <NumberField
        label={mode === "rh" ? "相對濕度" : "濕球溫度"}
        value={moisture}
        unit={mode === "rh" ? "%" : "°C WB"}
        onChange={onMoistureChange}
      />
    </section>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ToolTab>("load");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [enteringMode, setEnteringMode] = useState<MoistureMode>("rh");
  const [leavingMode, setLeavingMode] = useState<MoistureMode>("rh");
  const [airflowUnit, setAirflowUnit] = useState<AirflowUnit>("m3s");
  const [airDryBulb, setAirDryBulb] = useState("24");
  const [airProperty, setAirProperty] = useState<AirProperty>("rh");
  const [airPropertyValue, setAirPropertyValue] = useState("60");
  const [airAltitude, setAirAltitude] = useState("0");
  const [conversionUnit, setConversionUnit] =
    useState<ConversionUnit>("fun");
  const [conversionValue, setConversionValue] = useState("2.5");
  const [conversionTable, setConversionTable] =
    useState<ConversionTable>("fractions");

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const result = useMemo(() => {
    const enteringTemp = Number.parseFloat(form.enteringTemp);
    const enteringMoisture = Number.parseFloat(form.enteringMoisture);
    const leavingTemp = Number.parseFloat(form.leavingTemp);
    const leavingMoisture = Number.parseFloat(form.leavingMoisture);
    const airflowInput = Number.parseFloat(form.airflow);
    const altitude = Number.parseFloat(form.altitude);

    const values = [
      enteringTemp,
      enteringMoisture,
      leavingTemp,
      leavingMoisture,
      airflowInput,
      altitude,
    ];

    if (values.some((value) => !Number.isFinite(value))) {
      return { error: "請填妥所有數值。" };
    }
    if (enteringTemp < -20 || enteringTemp > 70 || leavingTemp < -20 || leavingTemp > 70) {
      return { error: "乾球溫度請輸入 -20°C 至 70°C。" };
    }
    if (airflowInput <= 0) {
      return { error: "風量必須大過 0。" };
    }
    if (altitude < -500 || altitude > 5000) {
      return { error: "海拔高度請輸入 -500m 至 5,000m。" };
    }
    if (
      (enteringMode === "rh" &&
        (enteringMoisture <= 0 || enteringMoisture > 100)) ||
      (leavingMode === "rh" &&
        (leavingMoisture <= 0 || leavingMoisture > 100))
    ) {
      return { error: "相對濕度請輸入 0 至 100%。" };
    }
    if (
      (enteringMode === "wb" && enteringMoisture > enteringTemp) ||
      (leavingMode === "wb" && leavingMoisture > leavingTemp)
    ) {
      return { error: "濕球溫度唔可以高過乾球溫度。" };
    }

    const pressure = pressureAtAltitude(altitude);
    const enteringRatio =
      enteringMode === "rh"
        ? humidityRatioFromRh(enteringTemp, enteringMoisture, pressure)
        : humidityRatioFromWetBulb(
            enteringTemp,
            enteringMoisture,
            pressure,
          );
    const leavingRatio =
      leavingMode === "rh"
        ? humidityRatioFromRh(leavingTemp, leavingMoisture, pressure)
        : humidityRatioFromWetBulb(leavingTemp, leavingMoisture, pressure);

    if (
      !Number.isFinite(enteringRatio) ||
      !Number.isFinite(leavingRatio) ||
      enteringRatio < 0 ||
      leavingRatio < 0
    ) {
      return { error: "溫濕度組合唔合理，請重新檢查數值。" };
    }

    const airflowM3s =
      airflowUnit === "m3s"
        ? airflowInput
        : airflowUnit === "m3h"
          ? airflowInput / 3600
          : airflowInput * 0.00047194745;
    const enteringEnthalpy = enthalpy(enteringTemp, enteringRatio);
    const leavingEnthalpy = enthalpy(leavingTemp, leavingRatio);
    const dryAirMassFlow =
      airflowM3s / specificVolume(enteringTemp, enteringRatio, pressure);
    const totalKw =
      dryAirMassFlow * (enteringEnthalpy - leavingEnthalpy);
    const averageRatio = (enteringRatio + leavingRatio) / 2;
    const sensibleKw =
      dryAirMassFlow *
      (1.006 + 1.86 * averageRatio) *
      (enteringTemp - leavingTemp);
    const latentKw = totalKw - sensibleKw;
    const condensateKgh =
      dryAirMassFlow * (enteringRatio - leavingRatio) * 3600;

    if (totalKw <= 0) {
      return {
        error:
          "計算結果冇冷量。請檢查入風／出風數值有冇調轉，或者出風焓值是否較高。",
      };
    }

    const warnings: string[] = [];
    if (leavingTemp >= enteringTemp) {
      warnings.push("出風溫度不低於入風");
    }
    if (condensateKgh < 0) {
      warnings.push("出風含濕量高於入風");
    }

    return {
      totalKw,
      sensibleKw,
      latentKw,
      condensateKgh,
      tons: totalKw / 3.51685284,
      btuh: totalKw * 3412.141633,
      shr: sensibleKw / totalKw,
      enteringEnthalpy,
      leavingEnthalpy,
      dryAirMassFlow,
      pressure,
      warnings,
    };
  }, [form, enteringMode, leavingMode, airflowUnit]);

  const airResult = useMemo(() => {
    const dryBulb = Number.parseFloat(airDryBulb);
    const propertyValue = Number.parseFloat(airPropertyValue);
    const altitude = Number.parseFloat(airAltitude);

    if (
      !Number.isFinite(dryBulb) ||
      !Number.isFinite(propertyValue) ||
      !Number.isFinite(altitude)
    ) {
      return { error: "請填妥所有數值。" };
    }
    if (dryBulb < -20 || dryBulb > 70) {
      return { error: "乾球溫度請輸入 -20°C 至 70°C。" };
    }
    if (altitude < -500 || altitude > 5000) {
      return { error: "海拔高度請輸入 -500m 至 5,000m。" };
    }

    const pressure = pressureAtAltitude(altitude);
    let humidityRatio: number;

    if (airProperty === "rh") {
      if (propertyValue <= 0 || propertyValue > 100) {
        return { error: "相對濕度請輸入 0 至 100%。" };
      }
      humidityRatio = humidityRatioFromRh(dryBulb, propertyValue, pressure);
    } else if (airProperty === "wb") {
      if (propertyValue > dryBulb || propertyValue < -80) {
        return { error: "濕球溫度必須低過或等於乾球溫度。" };
      }
      humidityRatio = humidityRatioFromWetBulb(
        dryBulb,
        propertyValue,
        pressure,
      );
    } else if (airProperty === "dp") {
      if (propertyValue > dryBulb || propertyValue < -80) {
        return { error: "露點溫度必須低過或等於乾球溫度。" };
      }
      humidityRatio = humidityRatioFromDewPoint(propertyValue, pressure);
    } else if (airProperty === "w") {
      if (propertyValue < 0 || propertyValue > 0.1) {
        return { error: "絕對濕度請輸入 0 至 0.1 kg/kg。" };
      }
      humidityRatio = propertyValue;
    } else {
      humidityRatio =
        (propertyValue - 1.006 * dryBulb) / (2501 + 1.86 * dryBulb);
    }

    const saturatedRatio = humidityRatioFromRh(dryBulb, 100, pressure);
    if (
      !Number.isFinite(humidityRatio) ||
      humidityRatio < 0 ||
      humidityRatio > saturatedRatio * 1.0001
    ) {
      return {
        error: "呢組數值唔合理，計算所得濕度超過 100% 或低過 0%。",
      };
    }

    const rh = relativeHumidity(dryBulb, humidityRatio, pressure);
    const dewPoint = dewPointFromHumidityRatio(humidityRatio, pressure);
    const wetBulb = wetBulbFromHumidityRatio(
      dryBulb,
      humidityRatio,
      pressure,
    );

    return {
      dryBulb,
      wetBulb,
      dewPoint,
      rh,
      humidityRatio,
      enthalpy: enthalpy(dryBulb, humidityRatio),
      specificVolume: specificVolume(dryBulb, humidityRatio, pressure),
      pressure,
    };
  }, [airDryBulb, airProperty, airPropertyValue, airAltitude]);

  const conversionResult = useMemo(() => {
    const inputValue =
      conversionUnit === "inch"
        ? parseInchValue(conversionValue)
        : Number.parseFloat(conversionValue);

    if (!Number.isFinite(inputValue)) {
      return {
        error:
          conversionUnit === "inch"
            ? "請輸入英吋小數或分數，例如 5/16、1 1/4。"
            : "請輸入有效數值。",
      };
    }
    if (inputValue < 0) {
      return { error: "尺寸唔可以係負數。" };
    }

    const millimetres =
      conversionUnit === "mm"
        ? inputValue
        : conversionUnit === "inch"
          ? inputValue * 25.4
          : (inputValue / 8) * 25.4;

    if (millimetres > 5000) {
      return { error: "尺寸請輸入 5,000 mm 以內。" };
    }

    const decimalInches = millimetres / 25.4;
    const fun = decimalInches * 8;
    const nearestMetric = standardMetricToolSizes.reduce((nearest, size) =>
      Math.abs(size - millimetres) < Math.abs(nearest - millimetres)
        ? size
        : nearest,
    );
    const nearestImperial = imperialToolSizes.reduce((nearest, size) =>
      Math.abs(size.inches * 25.4 - millimetres) <
      Math.abs(nearest.inches * 25.4 - millimetres)
        ? size
        : nearest,
    );

    return {
      millimetres,
      centimetres: millimetres / 10,
      decimalInches,
      fraction: inchFraction(decimalInches),
      fun,
      nearestMetric,
      nearestMetricDifference: Math.abs(nearestMetric - millimetres),
      nearestImperial,
      nearestImperialDifference: Math.abs(
        nearestImperial.inches * 25.4 - millimetres,
      ),
    };
  }, [conversionUnit, conversionValue]);

  const resetLoad = () => {
    setForm(defaultForm);
    setEnteringMode("rh");
    setLeavingMode("rh");
    setAirflowUnit("m3s");
  };

  const resetAir = () => {
    setAirDryBulb("24");
    setAirProperty("rh");
    setAirPropertyValue("60");
    setAirAltitude("0");
  };

  const resetConversion = () => {
    setConversionUnit("fun");
    setConversionValue("2.5");
    setConversionTable("fractions");
  };

  const reset = () => {
    if (activeTab === "load") {
      resetLoad();
    } else if (activeTab === "air") {
      resetAir();
    } else {
      resetConversion();
    }
  };

  const changeAirProperty = (nextProperty: AirProperty) => {
    if ("error" in airResult) {
      setAirPropertyValue(airPropertyOptions[nextProperty].defaultValue);
    } else {
      const nextValue: Record<AirProperty, string> = {
        rh: airResult.rh.toFixed(1),
        wb: airResult.wetBulb.toFixed(1),
        dp: airResult.dewPoint.toFixed(1),
        w: airResult.humidityRatio.toFixed(5),
        h: airResult.enthalpy.toFixed(1),
      };
      setAirPropertyValue(nextValue[nextProperty]);
    }
    setAirProperty(nextProperty);
  };

  return (
    <main>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand-mark" aria-hidden="true">
            ❄
          </div>
          <div className="brand-copy">
            <p>HVAC 現場工具</p>
            <h1>
              {activeTab === "load"
                ? "總冷量計算機"
                : activeTab === "air"
                  ? "空氣計算機"
                  : "公英制轉換"}
            </h1>
          </div>
          <button className="reset-button" type="button" onClick={reset}>
            重設
          </button>
        </header>

        <nav className="tool-tabs" aria-label="計算工具">
          <button
            type="button"
            className={activeTab === "load" ? "active" : ""}
            aria-current={activeTab === "load" ? "page" : undefined}
            onClick={() => setActiveTab("load")}
          >
            <span aria-hidden="true">❄</span>
            總冷量
          </button>
          <button
            type="button"
            className={activeTab === "air" ? "active" : ""}
            aria-current={activeTab === "air" ? "page" : undefined}
            onClick={() => setActiveTab("air")}
          >
            <span aria-hidden="true">◌</span>
            空氣計算機
          </button>
          <button
            type="button"
            className={activeTab === "convert" ? "active" : ""}
            aria-current={activeTab === "convert" ? "page" : undefined}
            onClick={() => setActiveTab("convert")}
          >
            <span aria-hidden="true">↔</span>
            公英制轉換
          </button>
        </nav>

        {activeTab === "load" ? (
          <>
            <div className="intro-row">
              <p>輸入風櫃前後空氣數據，即時計算盤管實際冷量。</p>
              <span>SI</span>
            </div>

            <div className="air-grid">
          <AirCard
            side="entering"
            mode={enteringMode}
            temp={form.enteringTemp}
            moisture={form.enteringMoisture}
            onModeChange={setEnteringMode}
            onTempChange={(value) => updateField("enteringTemp", value)}
            onMoistureChange={(value) =>
              updateField("enteringMoisture", value)
            }
          />
          <AirCard
            side="leaving"
            mode={leavingMode}
            temp={form.leavingTemp}
            moisture={form.leavingMoisture}
            onModeChange={setLeavingMode}
            onTempChange={(value) => updateField("leavingTemp", value)}
            onMoistureChange={(value) =>
              updateField("leavingMoisture", value)
            }
          />
            </div>

        <section className="flow-card" aria-labelledby="airflow-title">
          <div className="flow-card-heading">
            <div>
              <p className="eyebrow">AIRFLOW</p>
              <h2 id="airflow-title">風量</h2>
            </div>
            <div className="unit-toggle" aria-label="風量單位">
              {(Object.keys(airflowLabels) as AirflowUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={airflowUnit === unit ? "active" : ""}
                  aria-pressed={airflowUnit === unit}
                  onClick={() => setAirflowUnit(unit)}
                >
                  {airflowLabels[unit]}
                </button>
              ))}
            </div>
          </div>

          <div className="flow-fields">
            <NumberField
              label="實測風量"
              value={form.airflow}
              unit={airflowLabels[airflowUnit]}
              step={airflowUnit === "m3s" ? "0.01" : "1"}
              onChange={(value) => updateField("airflow", value)}
            />
            <NumberField
              label="海拔（選填）"
              value={form.altitude}
              unit="m"
              step="1"
              onChange={(value) => updateField("altitude", value)}
            />
          </div>
        </section>

        <section
          className={`result-card ${"error" in result ? "has-error" : ""}`}
          aria-live="polite"
        >
          {"error" in result ? (
            <div className="error-state">
              <span aria-hidden="true">!</span>
              <div>
                <p>未能計算</p>
                <h2>{result.error}</h2>
              </div>
            </div>
          ) : (
            <>
              <div className="total-result">
                <div>
                  <p className="eyebrow">TOTAL COOLING CAPACITY</p>
                  <h2>總冷量</h2>
                </div>
                <div className="total-number">
                  <strong>{format(result.totalKw, 1)}</strong>
                  <span>kW</span>
                </div>
              </div>

              <div className="conversion-line">
                <span>{format(result.tons, 2)} RT</span>
                <i aria-hidden="true" />
                <span>{format(result.btuh, 0)} Btu/h</span>
              </div>

              <div className="result-grid">
                <div>
                  <span>顯熱冷量</span>
                  <strong>{format(result.sensibleKw, 1)} kW</strong>
                </div>
                <div>
                  <span>潛熱冷量</span>
                  <strong>{format(result.latentKw, 1)} kW</strong>
                </div>
                <div>
                  <span>冷凝水量</span>
                  <strong>{format(result.condensateKgh, 1)} kg/h</strong>
                </div>
                <div>
                  <span>顯熱比 SHR</span>
                  <strong>{format(result.shr, 2)}</strong>
                </div>
              </div>

              {result.warnings.length > 0 && (
                <p className="warning">
                  請留意：{result.warnings.join("、")}。
                </p>
              )}
            </>
          )}
        </section>

        <details className="method-card">
          <summary>
            <span>計算資料及原理</span>
            <span aria-hidden="true">＋</span>
          </summary>
          {"error" in result ? (
            <p>輸入有效數值後，呢度會顯示計算資料。</p>
          ) : (
            <div className="method-content">
              <dl>
                <div>
                  <dt>入風焓值</dt>
                  <dd>{format(result.enteringEnthalpy, 1)} kJ/kg</dd>
                </div>
                <div>
                  <dt>出風焓值</dt>
                  <dd>{format(result.leavingEnthalpy, 1)} kJ/kg</dd>
                </div>
                <div>
                  <dt>乾空氣質量流量</dt>
                  <dd>{format(result.dryAirMassFlow, 2)} kg/s</dd>
                </div>
                <div>
                  <dt>大氣壓力</dt>
                  <dd>{format(result.pressure, 1)} kPa</dd>
                </div>
              </dl>
              <p>
                總冷量 = 乾空氣質量流量 ×（入風焓值 −
                出風焓值）。風量按入風狀態換算，適合現場快速估算盤管冷量。
              </p>
            </div>
          )}
        </details>

        <p className="footnote">
          計算結果屬現場估算；風量、溫度及濕度量度誤差都會影響結果。
        </p>
          </>
        ) : activeTab === "air" ? (
          <>
            <div className="intro-row air-intro">
              <p>
                輸入乾球溫度，再揀一項已知空氣數值，即時計出其餘狀態。
              </p>
              <span>SI</span>
            </div>

            <section
              className="air-input-card"
              aria-labelledby="air-input-title"
            >
              <div className="air-input-heading">
                <div>
                  <p className="eyebrow">KNOWN VALUES</p>
                  <h2 id="air-input-title">已知數值</h2>
                </div>
                <span>最少兩項</span>
              </div>

              <div className="air-base-grid">
                <NumberField
                  label="乾球溫度"
                  value={airDryBulb}
                  unit="°C DB"
                  onChange={setAirDryBulb}
                />
                <NumberField
                  label="海拔（選填）"
                  value={airAltitude}
                  unit="m"
                  step="1"
                  onChange={setAirAltitude}
                />
              </div>

              <div className="property-picker-heading">
                <span>第二個已知數值</span>
                <small>請選擇一項</small>
              </div>

              <div className="property-picker" aria-label="第二個空氣數值">
                {(Object.keys(airPropertyOptions) as AirProperty[]).map(
                  (property) => {
                    const option = airPropertyOptions[property];
                    return (
                      <button
                        key={property}
                        type="button"
                        className={`property-${property} ${
                          airProperty === property ? "active" : ""
                        }`}
                        aria-pressed={airProperty === property}
                        onClick={() => changeAirProperty(property)}
                      >
                        <span>{option.label}</span>
                        <small>
                          {option.shortLabel} · {option.unit}
                        </small>
                      </button>
                    );
                  },
                )}
              </div>

              <div className="selected-property">
                <NumberField
                  label={airPropertyOptions[airProperty].label}
                  value={airPropertyValue}
                  unit={airPropertyOptions[airProperty].unit}
                  step={airProperty === "w" ? "0.0001" : "0.1"}
                  onChange={setAirPropertyValue}
                />
              </div>
            </section>

            {"error" in airResult ? (
              <section
                className="result-card has-error air-result-error"
                aria-live="polite"
              >
                <div className="error-state">
                  <span aria-hidden="true">!</span>
                  <div>
                    <p>未能計算</p>
                    <h2>{airResult.error}</h2>
                  </div>
                </div>
              </section>
            ) : (
              <section
                className="air-output-card"
                aria-labelledby="air-output-title"
                aria-live="polite"
              >
                <div className="air-output-heading">
                  <div>
                    <p className="eyebrow">AIR STATE</p>
                    <h2 id="air-output-title">空氣狀態結果</h2>
                  </div>
                  <span>{format(airResult.pressure, 1)} kPa</span>
                </div>

                <div className="state-summary">
                  <div>
                    <span>乾球溫度</span>
                    <strong>{format(airResult.dryBulb, 1)}°C</strong>
                  </div>
                  <i aria-hidden="true" />
                  <div>
                    <span>相對濕度</span>
                    <strong>{format(airResult.rh, 1)}%</strong>
                  </div>
                </div>

                <div className="state-grid">
                  <article className="state-tile tile-db">
                    <div>
                      <span>乾球溫度</span>
                      <small>DB</small>
                    </div>
                    <p>
                      <strong>{format(airResult.dryBulb, 1)}</strong>
                      <span>°C</span>
                    </p>
                    <em>已輸入</em>
                  </article>
                  <article className="state-tile tile-wb">
                    <div>
                      <span>濕球溫度</span>
                      <small>WB</small>
                    </div>
                    <p>
                      <strong>{format(airResult.wetBulb, 1)}</strong>
                      <span>°C</span>
                    </p>
                    {airProperty === "wb" && <em>已輸入</em>}
                  </article>
                  <article className="state-tile tile-dp">
                    <div>
                      <span>露點溫度</span>
                      <small>DP</small>
                    </div>
                    <p>
                      <strong>{format(airResult.dewPoint, 1)}</strong>
                      <span>°C</span>
                    </p>
                    {airProperty === "dp" && <em>已輸入</em>}
                  </article>
                  <article className="state-tile tile-rh">
                    <div>
                      <span>相對濕度</span>
                      <small>RH</small>
                    </div>
                    <p>
                      <strong>{format(airResult.rh, 1)}</strong>
                      <span>%</span>
                    </p>
                    {airProperty === "rh" && <em>已輸入</em>}
                  </article>
                  <article className="state-tile tile-w">
                    <div>
                      <span>絕對濕度</span>
                      <small>W</small>
                    </div>
                    <p>
                      <strong>{format(airResult.humidityRatio, 5)}</strong>
                      <span>kg/kg</span>
                    </p>
                    {airProperty === "w" && <em>已輸入</em>}
                  </article>
                  <article className="state-tile tile-h">
                    <div>
                      <span>比焓值</span>
                      <small>h</small>
                    </div>
                    <p>
                      <strong>{format(airResult.enthalpy, 1)}</strong>
                      <span>kJ/kg</span>
                    </p>
                    {airProperty === "h" && <em>已輸入</em>}
                  </article>
                  <article className="state-tile tile-v">
                    <div>
                      <span>比容</span>
                      <small>v</small>
                    </div>
                    <p>
                      <strong>{format(airResult.specificVolume, 3)}</strong>
                      <span>m³/kg</span>
                    </p>
                  </article>
                </div>
              </section>
            )}

            <div className="air-note">
              <span aria-hidden="true">i</span>
              <p>
                空氣狀態最少需要兩個獨立數值先可以確定；呢度以乾球溫度配合另外一項數值計算。
              </p>
            </div>

            <p className="footnote">
              計算採用當地大氣壓力；如不輸入海拔，預設為海平面 101.3 kPa。
            </p>
          </>
        ) : (
          <>
            <div className="intro-row">
              <p>
                輸入 mm、英吋或「分」，即時互相轉換並搵出最接近嘅工具尺寸。
              </p>
              <span>mm / in</span>
            </div>

            <section
              className="conversion-card"
              aria-labelledby="conversion-input-title"
            >
              <div className="conversion-heading">
                <div>
                  <p className="eyebrow">SIZE CONVERTER</p>
                  <h2 id="conversion-input-title">輸入尺寸</h2>
                </div>
                <span>1吋 = 8分</span>
              </div>

              <div className="conversion-unit-toggle" aria-label="輸入單位">
                <button
                  type="button"
                  className={conversionUnit === "mm" ? "active" : ""}
                  aria-pressed={conversionUnit === "mm"}
                  onClick={() => {
                    setConversionUnit("mm");
                    setConversionValue("7.94");
                  }}
                >
                  毫米 <small>mm</small>
                </button>
                <button
                  type="button"
                  className={conversionUnit === "inch" ? "active" : ""}
                  aria-pressed={conversionUnit === "inch"}
                  onClick={() => {
                    setConversionUnit("inch");
                    setConversionValue("5/16");
                  }}
                >
                  英吋 <small>″</small>
                </button>
                <button
                  type="button"
                  className={conversionUnit === "fun" ? "active" : ""}
                  aria-pressed={conversionUnit === "fun"}
                  onClick={() => {
                    setConversionUnit("fun");
                    setConversionValue("2.5");
                  }}
                >
                  香港「分」 <small>1/8″</small>
                </button>
              </div>

              <label className="field conversion-field">
                <span className="field-label">
                  {conversionUnit === "mm"
                    ? "毫米尺寸"
                    : conversionUnit === "inch"
                      ? "英吋尺寸／分數"
                      : "幾多分"}
                </span>
                <span className="field-control">
                  <input
                    aria-label={
                      conversionUnit === "mm"
                        ? "毫米尺寸"
                        : conversionUnit === "inch"
                          ? "英吋尺寸或分數"
                          : "尺寸，單位分"
                    }
                    inputMode={conversionUnit === "inch" ? "text" : "decimal"}
                    type={conversionUnit === "inch" ? "text" : "number"}
                    step="0.01"
                    value={conversionValue}
                    onChange={(event) =>
                      setConversionValue(event.target.value)
                    }
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <span className="field-unit">
                    {conversionUnit === "mm"
                      ? "mm"
                      : conversionUnit === "inch"
                        ? "″"
                        : "分"}
                  </span>
                </span>
              </label>

              <div className="quick-size-heading">
                <span>常用英吋快速選擇</span>
                <small>撳一下即轉換</small>
              </div>
              <div className="quick-size-list">
                {quickInchFractions.map((fraction) => (
                  <button
                    key={fraction}
                    type="button"
                    onClick={() => {
                      setConversionUnit("inch");
                      setConversionValue(fraction);
                    }}
                  >
                    {fraction}″
                  </button>
                ))}
              </div>
            </section>

            {"error" in conversionResult ? (
              <section
                className="result-card has-error conversion-error"
                aria-live="polite"
              >
                <div className="error-state">
                  <span aria-hidden="true">!</span>
                  <div>
                    <p>未能轉換</p>
                    <h2>{conversionResult.error}</h2>
                  </div>
                </div>
              </section>
            ) : (
              <section
                className="conversion-result-card"
                aria-labelledby="conversion-result-title"
                aria-live="polite"
              >
                <div className="conversion-result-heading">
                  <div>
                    <p className="eyebrow">CONVERTED SIZE</p>
                    <h2 id="conversion-result-title">轉換結果</h2>
                  </div>
                  <span>最接近 1/64″</span>
                </div>

                <div className="conversion-hero">
                  <div>
                    <strong>
                      {format(conversionResult.millimetres, 2)}
                    </strong>
                    <span>mm</span>
                  </div>
                  <i aria-hidden="true">=</i>
                  <div>
                    <strong>{conversionResult.fraction}″</strong>
                    <span>{tradeFunLabel(conversionResult.fun)}</span>
                  </div>
                </div>

                <div className="conversion-result-grid">
                  <div>
                    <span>英吋小數</span>
                    <strong>
                      {format(conversionResult.decimalInches, 4)}″
                    </strong>
                  </div>
                  <div>
                    <span>厘米</span>
                    <strong>
                      {format(conversionResult.centimetres, 3)} cm
                    </strong>
                  </div>
                  <div>
                    <span>香港分制</span>
                    <strong>{tradeFunLabel(conversionResult.fun)}</strong>
                  </div>
                  <div>
                    <span>英吋分數</span>
                    <strong>{conversionResult.fraction}″</strong>
                  </div>
                </div>

                <div className="nearest-tools">
                  <div>
                    <span>最近公制工具</span>
                    <strong>{conversionResult.nearestMetric} mm</strong>
                    <small>
                      相差{" "}
                      {format(conversionResult.nearestMetricDifference, 2)} mm
                    </small>
                  </div>
                  <div>
                    <span>最近英制工具</span>
                    <strong>
                      {conversionResult.nearestImperial.label}″
                    </strong>
                    <small>
                      相差{" "}
                      {format(
                        conversionResult.nearestImperialDifference,
                        2,
                      )}{" "}
                      mm
                    </small>
                  </div>
                </div>
              </section>
            )}

            <div className="approx-warning">
              <span aria-hidden="true">!</span>
              <p>
                「最近工具尺寸」只供快速比較。螺絲或喉件配合緊時，唔好用近似尺寸強行代替，以免滑牙或損壞螺帽。
              </p>
            </div>

            <section
              className="size-table-card"
              aria-labelledby="size-table-title"
            >
              <div className="size-table-heading">
                <div>
                  <p className="eyebrow">FIELD SIZE GUIDE</p>
                  <h2 id="size-table-title">現場常用尺寸表</h2>
                </div>
              </div>

              <div className="size-table-tabs" aria-label="尺寸表分類">
                <button
                  type="button"
                  className={conversionTable === "fractions" ? "active" : ""}
                  onClick={() => setConversionTable("fractions")}
                >
                  分制對照
                </button>
                <button
                  type="button"
                  className={conversionTable === "tools" ? "active" : ""}
                  onClick={() => setConversionTable("tools")}
                >
                  五金工具
                </button>
                <button
                  type="button"
                  className={conversionTable === "copper" ? "active" : ""}
                  onClick={() => setConversionTable("copper")}
                >
                  冷氣銅喉
                </button>
              </div>

              <p className="table-copy">
                {conversionTable === "fractions"
                  ? "香港常用「分」制；半分等於 1/16吋。"
                  : conversionTable === "tools"
                    ? "常見套筒、士巴拿、鑽咀及六角匙英制尺寸。"
                    : "冷媒銅喉常見外徑（OD），屬實際英吋換算。"}
              </p>

              {conversionTable === "fractions" && (
                <div className="size-table table-fractions">
                  <div className="size-table-header">
                    <span>香港分制</span>
                    <span>英吋</span>
                    <span>毫米</span>
                  </div>
                  {Array.from({ length: 16 }, (_, index) => {
                    const inches = (index + 1) / 16;
                    const label = inchFraction(inches, 16);
                    return (
                      <button
                        className="size-table-row"
                        key={label}
                        type="button"
                        onClick={() => {
                          setConversionUnit("inch");
                          setConversionValue(label);
                        }}
                      >
                        <span>{tradeFunLabel(inches * 8)}</span>
                        <strong>{label}″</strong>
                        <span>{format(inches * 25.4, 2)} mm</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {conversionTable === "tools" && (
                <div className="size-table table-tools">
                  <div className="size-table-header">
                    <span>英制工具</span>
                    <span>毫米</span>
                    <span>最近公制</span>
                  </div>
                  {imperialToolSizes.map((size) => {
                    const millimetres = size.inches * 25.4;
                    const nearestMetric = standardMetricToolSizes.reduce(
                      (nearest, metricSize) =>
                        Math.abs(metricSize - millimetres) <
                        Math.abs(nearest - millimetres)
                          ? metricSize
                          : nearest,
                    );
                    return (
                      <button
                        className="size-table-row"
                        key={size.label}
                        type="button"
                        onClick={() => {
                          setConversionUnit("inch");
                          setConversionValue(size.label);
                        }}
                      >
                        <strong>{size.label}″</strong>
                        <span>{format(millimetres, 2)} mm</span>
                        <span>{nearestMetric} mm</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {conversionTable === "copper" && (
                <div className="size-table table-copper">
                  <div className="size-table-header">
                    <span>銅喉外徑</span>
                    <span>分制</span>
                    <span>毫米</span>
                  </div>
                  {copperTubeSizes.map((size) => (
                    <button
                      className="size-table-row"
                      key={size.label}
                      type="button"
                      onClick={() => {
                        setConversionUnit("inch");
                        setConversionValue(size.label);
                      }}
                    >
                      <strong>{size.label}″</strong>
                      <span>{tradeFunLabel(size.inches * 8)}</span>
                      <span>{format(size.inches * 25.4, 2)} mm</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <p className="footnote">
              表內英吋換算採用 1″ = 25.4 mm；點擊任何一行可直接套用到計算機。
            </p>
          </>
        )}
      </div>
    </main>
  );
}
