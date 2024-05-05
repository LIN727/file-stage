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
                    git branch: 'main', credentialsId: 'Github', url: 'https://github.com/LIN727/file-stage.git'
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
    }
}
