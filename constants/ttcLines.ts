// TTC Subway Line Constants
export type TTCLine = "1" | "2" | "4" | "5" | "6";

export interface TTCLineConfig {
    id: TTCLine;
    name: string;
    fullName: string;
    color: string;
    icon: string;
}

export const TTC_LINES: TTCLineConfig[] = [
    {
        id: "1",
        name: "Line 1",
        fullName: "Line 1 - Yonge-University",
        color: "#FFCE00", // Yellow
        icon: "subway",
    },
    {
        id: "2",
        name: "Line 2",
        fullName: "Line 2 - Bloor-Danforth",
        color: "#00853F", // Green
        icon: "subway",
    },
    {
        id: "4",
        name: "Line 4",
        fullName: "Line 4 - Sheppard",
        color: "#B933AD", // Purple
        icon: "subway",
    },
    {
        id: "5",
        name: "Line 5",
        fullName: "Line 5 - Eglinton",
        color: "#F27E00", // Orange
        icon: "subway",
    },
    {
        id: "6",
        name: "Line 6",
        fullName: "Line 6 - Finch West",
        color: "#808080", // Gray
        icon: "subway",
    },
];

export const getTTCLineConfig = (lineId: TTCLine): TTCLineConfig | undefined => {
    return TTC_LINES.find((line) => line.id === lineId);
};

export const getTTCLineColor = (lineId: TTCLine): string => {
    return getTTCLineConfig(lineId)?.color || "#808080";
};

export const getTTCLineName = (lineId: TTCLine): string => {
    return getTTCLineConfig(lineId)?.fullName || `Line ${lineId}`;
};
