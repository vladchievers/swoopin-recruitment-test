declare const _default: {
    logger: import("@harmonyjs/logger").ILogger;
    vehicles: any[];
    configure(vehicles: any): void;
    initializeVehicles(vehicles: any[]): void;
    updateVehicles(): void;
    getDrivers(): any[];
    setVehicleOnline(id: string): void;
    setVehicleOffline(id: string): void;
};
export default _default;
