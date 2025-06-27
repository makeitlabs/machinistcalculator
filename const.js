// Define default SFM (Surface Feet per Minute) and IPT (Inches Per Tooth) values
// These are simplified for demonstration and would typically come from manufacturer charts.
const materialProperties = {
    aluminum: { sfm: 200, ipt: 0.002 },
    stainless: { sfm: 72, ipt: 0.001 },
    steel: { sfm: 90, ipt: 0.0007 },
    brass: { sfm: 150, ipt: 0.002 },
    plastic: { sfm: 400, ipt: 0.002 }
};

// Global reduction factors for slotting/first pass, applied universally to all materials
const globalSfmReductionFactor = 0.7; // Example: Reduce SFM by 30% for slotting
const globalIptReductionFactor = 0.8; // Example: Reduce IPT by 80% for slotting


// Machine type limitations
const machineLimitations = {
    bridgeport: { rpmCap: 2000 }, // RPM max for Bridgeport
    tormach: { rpmCap: 4700 }, // RPM capped at 4700 for Tormach
    other: { rpmCap: Infinity } // "Other" for effectively unlimited RPM
};
