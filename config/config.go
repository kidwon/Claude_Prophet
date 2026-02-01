package config

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AlpacaAPIKey      string
	AlpacaSecretKey   string
	AlpacaBaseURL     string
	AlpacaPaper       bool
	GeminiAPIKey      string
	DatabasePath      string
	ServerPort        string
	EnableLogging     bool
	LogLevel          string
	DataRetentionDays int
}

var AppConfig *Config

func Load() error {
	// Try to load from Cloudflare Worker first if configured
	if configURL := os.Getenv("CONFIG_SERVICE_URL"); configURL != "" {
		if err := loadFromCloudflare(configURL); err == nil {
			// Successfully loaded from Cloudflare
			return loadConfigFromEnv()
		} else {
			// If Cloudflare fails, log and fall back to local .env
			fmt.Printf("Warning: Failed to load from Cloudflare (%v), falling back to local .env\n", err)
		}
	}

	// Load .env file if it exists (fallback or primary)
	if err := godotenv.Load(); err != nil {
		// .env file is optional, only warn
		fmt.Printf("Warning: .env file not found, using environment variables\n")
	}

	return loadConfigFromEnv()
}

// loadFromCloudflare fetches configuration from Cloudflare Worker and sets environment variables
func loadFromCloudflare(url string) error {
	token := os.Getenv("CONFIG_ACCESS_TOKEN")
	if token == "" {
		return fmt.Errorf("CONFIG_ACCESS_TOKEN not set")
	}

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	// Create POST request
	req, err := http.NewRequest("POST", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch config: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("config service returned %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var config map[string]string
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return fmt.Errorf("failed to parse config: %w", err)
	}

	// Set environment variables from Cloudflare response
	for key, value := range config {
		if value != "" {
			os.Setenv(key, value)
		}
	}

	fmt.Println("Successfully loaded configuration from Cloudflare Worker")
	return nil
}

// loadConfigFromEnv loads configuration from environment variables into AppConfig
func loadConfigFromEnv() error {
	AppConfig = &Config{
		AlpacaAPIKey:      os.Getenv("ALPACA_API_KEY"),
		AlpacaSecretKey:   os.Getenv("ALPACA_SECRET_KEY"),
		AlpacaBaseURL:     getEnvOrDefault("ALPACA_BASE_URL", "https://paper-api.alpaca.markets"),
		AlpacaPaper:       getEnvOrDefault("ALPACA_PAPER", "true") == "true",
		GeminiAPIKey:      os.Getenv("GEMINI_API_KEY"),
		DatabasePath:      getEnvOrDefault("DATABASE_PATH", "./data/prophet_trader.db"),
		ServerPort:        getEnvOrDefault("SERVER_PORT", "4534"),
		EnableLogging:     getEnvOrDefault("ENABLE_LOGGING", "true") == "true",
		LogLevel:          getEnvOrDefault("LOG_LEVEL", "info"),
		DataRetentionDays: 90,
	}

	return nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
