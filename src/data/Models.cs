using System;
using System.Collections.Generic;

namespace F1Manager.Data
{
    [System.Serializable]
    public class Driver
    {
        public string name;
        public int pace;        // 0-100
        public int consistency; // 0-100
        public int experience;  // 0-100
        public int adaptability; // Wet weather etc
        public float salary;

        // Granular stats
        public int overtaking;   // 0-100
        public int defending;    // 0-100
        public int tireManagement; // 0-100
        public int starts;       // 0-100
    }

    [System.Serializable]
    public class Track
    {
        public string name;
        public float baseLapTime; // Seconds
        public float tireWearFactor;
        public float fuelConsumption; // kg per lap
        public int totalLaps;
        public TrackSectorData sectors;
    }

    [System.Serializable]
    public class TrackSectorData
    {
        public float sector1; // % of lap time
        public float sector2;
        public float sector3;
    }

    [System.Serializable]
    public class Team
    {
        public string name;
        public float budget;
        public CarPerformance car;
        public List<Driver> lineup;
    }

    [System.Serializable]
    public class CarPerformance
    {
        public float aeroHighSpeed;   // 0-1
        public float aeroLowSpeed;    // 0-1
        public float powerUnit;       // 0-1
        public float ersEfficiency;   // 0-1
        public float chassisWeight;   // 0-1 (inverse)
        public float reliability;     // 0-1
    }
}
