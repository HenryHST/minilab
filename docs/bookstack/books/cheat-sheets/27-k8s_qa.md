---
title: Kubernetes Q&A
book_version: "1.0.0"
---

# Basic Kubernetes Interview Questions

## 1. What is Kubernetes?
 - Kubernetes is an open-source container orchestration platform.
 - It automates deployment, scaling, and management of containerized applications.

## 2. What is a Pod in Kubernetes?
 - A pod is the smallest deployable unit in Kubernetes.
 - It can contain one or more containers that share storage and network.

## 3. What is a ReplicaSet?
 - Ensures a specified number of identical pods are running at any time.
 - Automatically replaces crashed or deleted pods.

## 4. What is the difference between a Pod and a Deployment?
 - Pod is a single instance of a running container.
 - Deployment manages a ReplicaSet, which manages Pods — it ensures desired state, handles updates/rollbacks.

## 5. What is a Service in Kubernetes?
 - Abstracts access to a set of Pods.
 - Provides stable network endpoint (ClusterIP, NodePort, LoadBalancer).

## 6. What are the types of Services in Kubernetes?
 - ClusterIP: default, internal access only.
 - NodePort: exposes pod via static port on each node.
 - LoadBalancer: exposes app using external cloud load balancer.
 - ExternalName: maps to external DNS name.

## 7. What is a Namespace?
 - Logical cluster division to isolate resources (like environments: dev, test, prod).

## 8. What is a ConfigMap and a Secret?
 - ConfigMap: stores non-sensitive config like app settings.
 - Secret: stores sensitive data like passwords, tokens, and certs.

## 9. What is a DaemonSet?
 - Ensures a pod runs on every node in the cluster (e.g., log collectors or monitoring agents).

## 10. What is a StatefulSet?
 - Used for stateful applications (like databases).
 - Maintains sticky identity: each pod has a stable name and storage.

## 11. What is HPA (Horizontal Pod Autoscaler)?
 - Automatically scales pods based on CPU/memory usage or custom metrics.
 - Uses metrics server.

## 12. What is a Job and CronJob in Kubernetes?
 - Job: Runs a task to completion.
 - CronJob: Schedules a Job at specific intervals like a cron task.

## 13. What is a Node?
 - A worker machine in Kubernetes (virtual or physical).
 - Pods are scheduled to nodes by the scheduler.

## 14. What is Kubelet, Kube-Proxy, and Container Runtime?
 - Kubelet: Agent that runs on each node, communicates with the API server.
 - Kube-proxy: Maintains network rules and handles service routing.
 - Container Runtime: Runs containers (Docker, containerd).

## 15. What is etcd?
 - A distributed key-value store.
 - Stores Kubernetes cluster state and configuration.

## 16. What is the Kubernetes Control Plane?
 includea:
 - kube-apiserver
 - etcd
 - kube-scheduler
 - kube-controller-manager
 - cloud-controller-manager

## 17. How does Kubernetes handle rolling updates?
 - Gradually replaces old pods with new ones using Deployment strategy.
 - Supports zero-downtime updates.

## 18. How do you do a rollback in Kubernetes?
 - kubectl rollout undo deployment myapp

## 19. What happens when a pod crashes?
 - ReplicaSet or Deployment controller automatically recreates it.

## 20. How do you troubleshoot a failing pod?
 - kubectl get pods
 - kubectl describe pod <name>
 - kubectl logs <name>
 - kubectl exec -it <name> -- bash
