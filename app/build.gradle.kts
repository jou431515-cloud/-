plugins {
    id("com.android.application")
}

// GitHub Actions 빌드 번호를 버전 코드로 사용 → 새 APK를 덮어 설치할 수 있음
val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "com.woojin.guitarchords"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.woojin.guitarchords"
        minSdk = 26
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
    }

    signingConfigs {
        // 개인용 앱이라 서명 키를 저장소에 함께 둠 (항상 같은 키로 서명 → 업데이트 설치 가능)
        create("release") {
            storeFile = file("release.keystore")
            storePassword = "guitarchords"
            keyAlias = "guitarchords"
            keyPassword = "guitarchords"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    sourceSets {
        getByName("main") {
            // 앱 화면(HTML/JS)은 저장소의 web 폴더를 그대로 사용
            assets.srcDirs("../web")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
