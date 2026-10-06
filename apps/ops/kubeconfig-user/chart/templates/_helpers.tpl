{{/*
Expand the name of the chart.
*/}}
{{- define "kubeconfig-user.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kubeconfig-user.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "kubeconfig-user.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "kubeconfig-user.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "kubeconfig-user.saName" -}}
{{- .Values.serviceAccount.name }}
{{- end }}

{{- define "kubeconfig-user.tokenSecretName" -}}
{{- if .Values.tokenSecret.name }}
{{- .Values.tokenSecret.name }}
{{- else }}
{{- printf "%s-token" (include "kubeconfig-user.saName" .) }}
{{- end }}
{{- end }}

{{- define "kubeconfig-user.crbName" -}}
{{- if .Values.clusterRoleBinding.name }}
{{- .Values.clusterRoleBinding.name }}
{{- else }}
{{- printf "%s-cluster-admin" (include "kubeconfig-user.saName" .) }}
{{- end }}
{{- end }}

{{- define "kubeconfig-user.kubeconfigSecretName" -}}
{{- .Values.kubeconfigJob.secretName }}
{{- end }}

{{- define "kubeconfig-user.jobSaName" -}}
{{- .Values.kubeconfigJob.serviceAccountName }}
{{- end }}

{{- define "kubeconfig-user.namespace" -}}
{{- .Release.Namespace }}
{{- end }}
