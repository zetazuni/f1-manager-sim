using System;
using System.IO;
using System.Collections.Generic;
using System.Text.Json;
using F1Manager.Data;

namespace F1Manager.Data
{
    public class DataManager
    {
        public static GameData LoadGameData(string filePath)
        {
            string jsonString = File.ReadAllText(filePath);
            return JsonSerializer.Deserialize<GameData>(jsonString);
        }
    }

    public class GameData
    {
        public List<Driver> drivers { get; set; }
        public List<Track> tracks { get; set; }
    }
}
