package com.substring.docmind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@SpringBootApplication
public class MindoraBackendApplication {

	public static void main(String[] args) {
		loadDotEnv();
		SpringApplication.run(MindoraBackendApplication.class, args);
	}

	private static void loadDotEnv() {
		try {
			Path envPath = Paths.get(".env");
			if (!Files.exists(envPath)) {
				envPath = Paths.get("../.env");
			}
			if (Files.exists(envPath)) {
				List<String> lines = Files.readAllLines(envPath);
				for (String line : lines) {
					String trimmed = line.trim();
					if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
					int eqIdx = trimmed.indexOf('=');
					if (eqIdx > 0) {
						String key = trimmed.substring(0, eqIdx).trim();
						String value = trimmed.substring(eqIdx + 1).trim();
						if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						} else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
							value = value.substring(1, value.length() - 1);
						}
						if (System.getProperty(key) == null && System.getenv(key) == null) {
							System.setProperty(key, value);
						}
					}
				}
			}
		} catch (Exception ignored) {
		}
	}

}
