plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Server the WebView loads. 10.0.2.2 is the host machine seen from the emulator.
// Override: ./gradlew assembleDebug -PserverUrl=http://192.168.1.5:3000
val serverUrl = (project.findProperty("serverUrl") as String?) ?: "http://10.0.2.2:3000"

android {
    namespace = "com.kiranaq.shell"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kiranaq.shell"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "SERVER_URL", "\"$serverUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core:1.13.1")
}
