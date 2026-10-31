/**
 * The fx-991ES Plus's 40 scientific constants and 40 metric conversions.
 *
 * The values are the manual's CODATA (2014) set and NIST SP 811 factors. The
 * calculator shows each constant by its symbol; this table also carries the
 * name and unit so the app's browser and the ⌘K palette can search in words a
 * reader knows.
 */

export interface ScientificConstant {
  /** The two-digit number on the CONST menu. */
  readonly index: string;
  /** The symbol the calculator displays. */
  readonly symbol: string;
  readonly name: string;
  readonly value: number;
  readonly unit: string;
}

export const scientificConstants: ReadonlyArray<ScientificConstant> = [
  {
    index: "01",
    symbol: "mp",
    name: "proton mass",
    value: 1.672621898e-27,
    unit: "kg",
  },
  {
    index: "02",
    symbol: "mn",
    name: "neutron mass",
    value: 1.674927471e-27,
    unit: "kg",
  },
  {
    index: "03",
    symbol: "me",
    name: "electron mass",
    value: 9.10938356e-31,
    unit: "kg",
  },
  {
    index: "04",
    symbol: "mμ",
    name: "muon mass",
    value: 1.883531594e-28,
    unit: "kg",
  },
  {
    index: "05",
    symbol: "a₀",
    name: "Bohr radius",
    value: 5.2917721067e-11,
    unit: "m",
  },
  {
    index: "06",
    symbol: "h",
    name: "Planck constant",
    value: 6.62607004e-34,
    unit: "J·s",
  },
  {
    index: "07",
    symbol: "μN",
    name: "nuclear magneton",
    value: 5.050783699e-27,
    unit: "J/T",
  },
  {
    index: "08",
    symbol: "μB",
    name: "Bohr magneton",
    value: 9.274009994e-24,
    unit: "J/T",
  },
  {
    index: "09",
    symbol: "ℏ",
    name: "Planck constant, rationalized",
    value: 1.0545718e-34,
    unit: "J·s",
  },
  {
    index: "10",
    symbol: "α",
    name: "fine-structure constant",
    value: 7.2973525664e-3,
    unit: "",
  },
  {
    index: "11",
    symbol: "re",
    name: "classical electron radius",
    value: 2.8179403227e-15,
    unit: "m",
  },
  {
    index: "12",
    symbol: "λC",
    name: "Compton wavelength",
    value: 2.4263102367e-12,
    unit: "m",
  },
  {
    index: "13",
    symbol: "γp",
    name: "proton gyromagnetic ratio",
    value: 2.6752219e8,
    unit: "s⁻¹T⁻¹",
  },
  {
    index: "14",
    symbol: "λCp",
    name: "proton Compton wavelength",
    value: 1.32140985539e-15,
    unit: "m",
  },
  {
    index: "15",
    symbol: "λCn",
    name: "neutron Compton wavelength",
    value: 1.31959090481e-15,
    unit: "m",
  },
  {
    index: "16",
    symbol: "R∞",
    name: "Rydberg constant",
    value: 10973731.568508,
    unit: "m⁻¹",
  },
  {
    index: "17",
    symbol: "u",
    name: "atomic mass unit",
    value: 1.66053904e-27,
    unit: "kg",
  },
  {
    index: "18",
    symbol: "μp",
    name: "proton magnetic moment",
    value: 1.4106067873e-26,
    unit: "J/T",
  },
  {
    index: "19",
    symbol: "μe",
    name: "electron magnetic moment",
    value: -9.28476462e-24,
    unit: "J/T",
  },
  {
    index: "20",
    symbol: "μn",
    name: "neutron magnetic moment",
    value: -9.662365e-27,
    unit: "J/T",
  },
  {
    index: "21",
    symbol: "μμ",
    name: "muon magnetic moment",
    value: -4.49044826e-26,
    unit: "J/T",
  },
  {
    index: "22",
    symbol: "F",
    name: "Faraday constant",
    value: 96485.33289,
    unit: "C/mol",
  },
  {
    index: "23",
    symbol: "e",
    name: "elementary charge",
    value: 1.6021766208e-19,
    unit: "C",
  },
  {
    index: "24",
    symbol: "NA",
    name: "Avogadro constant",
    value: 6.022140857e23,
    unit: "mol⁻¹",
  },
  {
    index: "25",
    symbol: "k",
    name: "Boltzmann constant",
    value: 1.38064852e-23,
    unit: "J/K",
  },
  {
    index: "26",
    symbol: "Vm",
    name: "molar volume of ideal gas",
    value: 2.2710953e-2,
    unit: "m³/mol",
  },
  {
    index: "27",
    symbol: "R",
    name: "molar gas constant",
    value: 8.3144598,
    unit: "J/(mol·K)",
  },
  {
    index: "28",
    symbol: "C₀",
    name: "speed of light in vacuum",
    value: 2.99792458e8,
    unit: "m/s",
  },
  {
    index: "29",
    symbol: "C₁",
    name: "first radiation constant",
    value: 3.74177179e-16,
    unit: "W·m²",
  },
  {
    index: "30",
    symbol: "C₂",
    name: "second radiation constant",
    value: 1.43877736e-2,
    unit: "m·K",
  },
  {
    index: "31",
    symbol: "σ",
    name: "Stefan-Boltzmann constant",
    value: 5.670367e-8,
    unit: "W/(m²·K⁴)",
  },
  {
    index: "32",
    symbol: "ε₀",
    name: "electric constant",
    value: 8.854187817e-12,
    unit: "F/m",
  },
  {
    index: "33",
    symbol: "μ₀",
    name: "magnetic constant",
    value: 1.2566370614e-6,
    unit: "N/A²",
  },
  {
    index: "34",
    symbol: "Φ₀",
    name: "magnetic flux quantum",
    value: 2.067833831e-15,
    unit: "Wb",
  },
  {
    index: "35",
    symbol: "g",
    name: "standard acceleration of gravity",
    value: 9.80665,
    unit: "m/s²",
  },
  {
    index: "36",
    symbol: "G₀",
    name: "conductance quantum",
    value: 7.748091731e-5,
    unit: "S",
  },
  {
    index: "37",
    symbol: "Z₀",
    name: "characteristic impedance of vacuum",
    value: 376.730313461,
    unit: "Ω",
  },
  {
    index: "38",
    symbol: "t",
    name: "Celsius temperature",
    value: 273.15,
    unit: "K",
  },
  {
    index: "39",
    symbol: "G",
    name: "Newtonian constant of gravitation",
    value: 6.67408e-11,
    unit: "m³/(kg·s²)",
  },
  {
    index: "40",
    symbol: "atm",
    name: "standard atmosphere",
    value: 101325,
    unit: "Pa",
  },
];

export interface MetricConversion {
  readonly index: string;
  readonly from: string;
  readonly to: string;
  readonly factor: number;
  /** A non-multiplicative conversion (temperature) overrides the factor. */
  readonly convert?: (value: number) => number;
}

const product = (from: string, to: string, factor: number) => ({
  from,
  to,
  factor,
  convert: (value: number) => value * factor,
});

export const metricConversions: ReadonlyArray<MetricConversion> = [
  { index: "01", ...product("in", "cm", 2.54) },
  { index: "02", ...product("cm", "in", 1 / 2.54) },
  { index: "03", ...product("ft", "m", 0.3048) },
  { index: "04", ...product("m", "ft", 1 / 0.3048) },
  { index: "05", ...product("yd", "m", 0.9144) },
  { index: "06", ...product("m", "yd", 1 / 0.9144) },
  { index: "07", ...product("mile", "km", 1.609344) },
  { index: "08", ...product("km", "mile", 1 / 1.609344) },
  { index: "09", ...product("n mile", "m", 1852) },
  { index: "10", ...product("m", "n mile", 1 / 1852) },
  { index: "11", ...product("acre", "m²", 4046.8564224) },
  { index: "12", ...product("m²", "acre", 1 / 4046.8564224) },
  { index: "13", ...product("gal (US)", "ℓ", 3.785411784) },
  { index: "14", ...product("ℓ", "gal (US)", 1 / 3.785411784) },
  { index: "15", ...product("gal (UK)", "ℓ", 4.54609) },
  { index: "16", ...product("ℓ", "gal (UK)", 1 / 4.54609) },
  { index: "17", ...product("pc", "km", 3.085677581e13) },
  { index: "18", ...product("km", "pc", 1 / 3.085677581e13) },
  { index: "19", ...product("km/h", "m/s", 1 / 3.6) },
  { index: "20", ...product("m/s", "km/h", 3.6) },
  { index: "21", ...product("oz", "g", 28.349523125) },
  { index: "22", ...product("g", "oz", 1 / 28.349523125) },
  { index: "23", ...product("lb", "kg", 0.45359237) },
  { index: "24", ...product("kg", "lb", 1 / 0.45359237) },
  { index: "25", ...product("atm", "Pa", 101325) },
  { index: "26", ...product("Pa", "atm", 1 / 101325) },
  { index: "27", ...product("mmHg", "Pa", 133.322387415) },
  { index: "28", ...product("Pa", "mmHg", 1 / 133.322387415) },
  { index: "29", ...product("hp", "kW", 0.7456998715822702) },
  { index: "30", ...product("kW", "hp", 1 / 0.7456998715822702) },
  { index: "31", ...product("kgf/cm²", "Pa", 98066.5) },
  { index: "32", ...product("Pa", "kgf/cm²", 1 / 98066.5) },
  { index: "33", ...product("kgf·m", "J", 9.80665) },
  { index: "34", ...product("J", "kgf·m", 1 / 9.80665) },
  { index: "35", ...product("lbf/in²", "kPa", 6.894757293168361) },
  { index: "36", ...product("kPa", "lbf/in²", 1 / 6.894757293168361) },
  {
    index: "37",
    from: "°F",
    to: "°C",
    factor: 1,
    convert: (value) => ((value - 32) * 5) / 9,
  },
  {
    index: "38",
    from: "°C",
    to: "°F",
    factor: 1,
    convert: (value) => (value * 9) / 5 + 32,
  },
  { index: "39", ...product("J", "cal", 1 / 4.184) },
  { index: "40", ...product("cal", "J", 4.184) },
];
