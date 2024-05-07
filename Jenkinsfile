pipeline {
    agent any
    stages {
        stage('Clean workspace') {
            steps {
                cleanWs()
            }
        }
        stage('Pull repository') {
            steps {
                script {
                    git branch: 'main', url: 'https://github.com/LIN727/file-stage.git'
                }
            }
        }
        stage("Sonarqube analysis") {
            environment {
                SCANNER_HOME=tool 'sonar-scanner'
            }
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh ''' $SCANNER_HOME/bin/sonar-scanner -Dsonar.projectName=FileStage \
                    -Dsonar.projectKey=FileStage '''
                }
            }
        }
        stage("Quality gate") {
           steps {
                script {
                    waitForQualityGate abortPipeline: false, credentialsId: 'Sonar-token' 
                }
            } 
        }
        stage('Print infomation') {
            steps {
                sh '''
                    docker version
                    docker info
                    docker compose version
                '''
            }
        }
        stage('Build containers') {
            steps {
                sh 'cd ./client && docker build -t kevinwutech/devops:web-1.0 ./'
                sh 'cd ./server && docker build -t kevinwutech/devops:api-1.0 ./'
                sh 'cd ./nginx && docker build -t kevinwutech/devops:nginx-1.0 ./'
            }
        }
        stage('Push containers') {
            steps {
                script {
                    docker.withRegistry('', 'docker') {
                        sh 'docker compose push'
                    }
                }
            }
        }
        stage('Run containers') {
            steps {
                sh 'docker compose up -d --no-color --wait'
                sh 'docker compose ps'
            }
        }
        stage('Deploy to kubernetes') {
            steps {
                sh 'kubectl apply -f argocd-app-config.yaml'
            }
        }
    }
}
