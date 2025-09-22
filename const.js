// Define default SFM (Surface Feet per Minute) and IPT (Inches Per Tooth) values
// These are simplified for demonstration and would typically come from manufacturer charts.

// These were the original, base numbers
const origMaterialProperties = {
    aluminum: { sfm: 200, ipt: 0.002 },
    stainless: { sfm: 72, ipt: 0.001 },
    steel: { sfm: 90, ipt: 0.0007 },
    brass: { sfm: 150, ipt: 0.002 },
    plastic: { sfm: 400, ipt: 0.002 }
};

// Global reduction factors for slotting/first pass, applied universally to all materials
const globalSfmReductionFactor = 0.7; // Example: Reduce SFM by 30% for slotting
const globalIptReductionFactor = 0.8; // Example: Reduce IPT by 80% for slotting
const SMALL_TOOL_THRESHOLD = 0.2; // 1/8 inch


// Machine type limitations
const machineLimitations = {
    bridgeport: { rpmCap: 2000 }, // RPM max for Bridgeport
    tormach: { rpmCap: 4700 }, // RPM capped at 4700 for Tormach
    liltormy: { rpmCap: 20000 }, // RPM capped at 20000 for Little Tormach
    other: { rpmCap: Infinity } // "Other" for effectively unlimited RPM
};

const IPT_SCALE_FACTOR = 10000;

const materialProperties = {
    aluminum: {
        // SFM and IPT ranges for the sliders
        sfmSliderRange: { default: 200, min: 100, max: 1000 },
        iptSliderRange: { default: 20, min: 1, max: 40 }, // Scaled IPT range for slider (0.0001 to 0.004)
        // Specific diameter-dependent data (SFM and IPT)
        // IPT values here are UN-SCALED, will be scaled when used in calculations
        diameterData: [
            // { diameterInch: 0.019685, sfm: 500, ipt: 0.00015 }, // ~0.5mm
            // { diameterInch: 0.03937, sfm: 550, ipt: 0.0002 },  // ~1mm - SFM increases
            // { diameterInch: 0.0625, sfm: 600, ipt: 0.00025 },  // 1/16" - SFM peaks
            // { diameterInch: 0.07874, sfm: 550, ipt: 0.0003 },  // ~2mm - SFM starts to decrease
            { diameterInch: 0.07874, sfm: 400, ipt: 0.00013 },  // ~2mm
            //{ diameterInch: 0.11811, sfm: 300, ipt: 0.0005 },  // ~3mm
            //{ diameterInch: 0.23622, sfm: 250, ipt: 0.0010 },  // ~6mm
            //{ diameterInch: 0.47244, sfm: 200, ipt: 0.0020 },  // ~12mm
            //{ diameterInch: 0.125, sfm: 300, ipt: 0.0018 }    ,
            { diameterInch: 0.25, sfm: 200, ipt: 0.0020 }    
        ] // Removed .sort() - assuming data is pre-sorted
    },
    stainless: {
        sfmSliderRange: { default: 72, min: 30, max: 250 },
        iptSliderRange: { default: 10, min: 1, max: 20 },
        diameterData: [
            //{ diameterInch: 0.019685, sfm: 120, ipt: 0.00008 },
            //{ diameterInch: 0.03937, sfm: 100, ipt: 0.0001 },
            //{ diameterInch: 0.0625, sfm: 90, ipt: 0.00015 },
            { diameterInch: 0.07874, sfm: 90, ipt: 0.0002 }, // 2mm
            //{ diameterInch: 0.15748, sfm: 80, ipt: 0.0003 }, // 4mm
            //{ diameterInch: 0.23622, sfm: 65, ipt: 0.0004 },
            { diameterInch: 0.25, sfm: 72, ipt: 0.001 }, 
            { diameterInch: 0.7874, sfm: 72, ipt: 0.001 }
        ] // Removed .sort() - assuming data is pre-sorted
    },
    steel: {
        sfmSliderRange: { default: 90, min: 40, max: 200 },
        iptSliderRange: { default: 7, min: 1, max: 15 },
        diameterData: [
            //{ diameterInch: 0.019685, sfm: 100, ipt: 0.00005 },
            //{ diameterInch: 0.03937, sfm: 80, ipt: 0.0001 },
            //{ diameterInch: 0.0625, sfm: 70, ipt: 0.00012 },
            { diameterInch: 0.07874, sfm: 120, ipt: 0.00015 }, // 2mm
            { diameterInch: 0.15748, sfm: 110, ipt: 0.0002 }, // 4mm
            { diameterInch: 0.23622, sfm: 100, ipt: 0.0003 },
            { diameterInch: 0.3937, sfm: 90, ipt: 0.0007 },
            { diameterInch: 0.7874, sfm: 90, ipt: 0.0007 }
        ] 
    },
    brass: {
        // For materials without specific diameter data, use the default from their slider ranges
        sfmSliderRange: { default: 150, min: 75, max: 300 },
        iptSliderRange: { default: 20, min: 10, max: 40 }, // Scaled IPT
        diameterData: [
            { diameterInch: 0.07874, sfm: 190, ipt: 0.0005 }, // 2mm
            { diameterInch: 0.15748, sfm: 170, ipt: 0.001 }, // 4mm
            { diameterInch: 0.75, sfm: 150, ipt: 0.002 }
        ] 
    },
    plastic: {
        sfmSliderRange: { default: 400, min: 200, max: 800 },
        iptSliderRange: { default: 20, min: 10, max: 40 }, // Scaled IPT
        diameterData: [
            { diameterInch: 0.07874, sfm: 600, ipt: 0.0005 }, // 2mm
            { diameterInch: 0.15748, sfm: 500, ipt: 0.001 }, // 4mm
            { diameterInch: 0.75, sfm: 400, ipt: 0.002 }
        ] 
    }
};

// Function to get diameter-adjusted SFM and IPT
function no_interp_getDiameterAdjustedProperties(materialKey, currentDiameterInches) {
    const material = materialProperties[materialKey];

    if (material.diameterData) {
        let effectiveSFM = material.sfmSliderRange.default; // Fallback
        let effectiveIPT = material.iptSliderRange.default / IPT_SCALE_FACTOR; // Fallback (unscaled)

        let selectedDataPoint = material.diameterData[0]; // Start with the smallest tool data
        for (let i = 0; i < material.diameterData.length; i++) {
            // Compare currentDiameterInches with diameterInch from data
            if (currentDiameterInches >= material.diameterData[i].diameterInch) {
                selectedDataPoint = material.diameterData[i];
            } else {
                // We've passed the diameter, so the previous dataPoint is the correct one.
                break;
            }
        }

        effectiveSFM = selectedDataPoint.sfm;
        effectiveIPT = selectedDataPoint.ipt; // This is the unscaled IPT from the data

        return { sfm: effectiveSFM, ipt: effectiveIPT };

    } else {
        // For materials without specific diameter data, use the default from their slider ranges
        return {
            sfm: material.sfmSliderRange.default,
            ipt: material.iptSliderRange.default / IPT_SCALE_FACTOR // Unscale default IPT
        };
    }
}
// Function to get diameter-adjusted SFM and IPT using linear interpolation
function getDiameterAdjustedProperties(materialKey, currentDiameterInches) {
    const material = materialProperties[materialKey];

    if (material.diameterData && material.diameterData.length > 0) {
        const data = material.diameterData;

        // Handle cases outside the data range
        if (currentDiameterInches <= data[0].diameterInch) {
            return { sfm: data[0].sfm, ipt: data[0].ipt };
        }
        if (currentDiameterInches >= data[data.length - 1].diameterInch) {
            return { sfm: data[data.length - 1].sfm, ipt: data[data.length - 1].ipt };
        }

        // Find the two data points to interpolate between
        let lowerBound = data[0];
        let upperBound = data[data.length - 1];

        for (let i = 0; i < data.length - 1; i++) {
            if (currentDiameterInches >= data[i].diameterInch && currentDiameterInches <= data[i+1].diameterInch) {
                lowerBound = data[i];
                upperBound = data[i+1];
                break;
            }
        }

        // Perform linear interpolation
        const range = upperBound.diameterInch - lowerBound.diameterInch;
        const ratio = (currentDiameterInches - lowerBound.diameterInch) / range;

        const interpolatedSFM = lowerBound.sfm + (upperBound.sfm - lowerBound.sfm) * ratio;
        const interpolatedIPT = lowerBound.ipt + (upperBound.ipt - lowerBound.ipt) * ratio;

        return { sfm: interpolatedSFM, ipt: interpolatedIPT };

    } else {
        // For materials without specific diameter data, use the default from their slider ranges
        return {
            sfm: material.sfmSliderRange.default,
            ipt: material.iptSliderRange.default / IPT_SCALE_FACTOR // Unscale default IPT
        };
    }
}

function getDepthOfCut(diameterInches) {
  let recommended, maximum;

  if (diameterInches < 0.040) {
    // Very tiny endmills (<1.0 mm)
    recommended = diameterInches * 0.10;
    maximum     = diameterInches * 0.20;
  } else if (diameterInches < 0.200) {
    // Small endmills (<1/8")
    recommended = diameterInches * 0.15;
    maximum     = diameterInches * 0.25;
  } else {
    // Normal / larger endmills
    recommended = diameterInches * 0.50;
    maximum     = diameterInches * 1.00;
  }

  return {
    recommended: recommended,
    maximum: maximum
  };
}
