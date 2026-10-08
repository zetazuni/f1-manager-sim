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
    }

    [System.Serializable]
    public class Track
    {
        public string name;
        public float baseLapTime; // Seconds
        public float tireWearFactor;
        public float fuelConsumption; // kg per lap
        public int totalLaps;
    }

    [System.Serializable]
    public class Team
    {
        public string name;
        public float budget;
        public CarPerformance car;
    }

    [System.Serializable]
    public class CarPerformance
    {
        public float aero;   // 0-1
        public float engine; // 0-1
        public float chassis;// 0-1
        public float reliability; // 0-1
    }
}
