interface Unit {
    toUnit: (seconds: number) => number;
    short: string;
    name: string;
}

const Minutes: Unit = {
    toUnit: (s) => s / 60,
    name: '分',
    short: '分',
};
const Hours: Unit = {
    toUnit: (s) => Minutes.toUnit(s) / 60,
    name: '時間',
    short: '時間',
};
const Days: Unit = {
    toUnit: (s) => Hours.toUnit(s) / 24,
    name: '日',
    short: '日',
};

export const ofSeconds = (seconds: number): Unit => {
    if (seconds < 2 * 60 * 60) {
        return Minutes;
    }

    if (seconds < 30 * 60 * 60) {
        return Hours;
    }

    return Days;
};
