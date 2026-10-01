---
title: Minikube
book_version: "1.0.0"
---

# Minikube Cheat-Sheet

Like kind, minikube is a tool that lets you run Kubernetes locally. minikube runs a single-node Kubernetes cluster on your personal computer (including Windows, macOS and Linux PCs) so that you can try out Kubernetes, or for daily development work.
minikube quickly sets up a local Kubernetes cluster on macOS, Linux, and Windows. We proudly focus on helping application developers and new Kubernetes users.


## Highlights
- Supports the latest Kubernetes release (+6 previous minor versions)
- Cross-platform (Linux, macOS, Windows)
- Deploy as a VM, a container, or on bare-metal
- Multiple container runtimes (CRI-O, containerd, docker)
- Docker API endpoint for blazing fast image pushes
- Advanced features such as LoadBalancer, filesystem mounts, and FeatureGates
- Addons for easily installed Kubernetes applications

## 1.1 MINIKUBE BASIC
Name Command minikube lifecycle
minikube delete, minikube start, minikube status,

Link: minikubeGet minikube version
minikube version,

Link: all minikube releasesmac install minikube
brew cask install minikube, brew cask reinstall minikube

Start minikube with different machine flavor
minikube start --memory 5120 --cpus=4

Start minikube with a specific k8s version
minikube start --kubernetes-version v1.11.0

Start minikube with more customizationsminikube start –kubernetes-version v1.11.0 –feature-gates=AdvancedAuditing=trueSSH to minikube vm
minikube ssh, ssh -i ~/.minikube/machines/minikube/id_rsa docker@192.168.99.100

Your local docker to use minikube dockerd
eval $(minikube docker-env),
Then no need for docker push
Minikube check latest version
minikube update-check

## 1.2 CHECK STATUS
Name Command Get minikube version
minikube version,

Link: all minikube releasesGet cluster info
kubectl cluster-info

Get service info

minikube service <srv-name>

Get dashboard
minikube dashboard

Get ip
minikube ip

Get minikube log
minikube logs

List addons
minikube addons list

## 1.3 MINIKUBE FOLDERS
NameCommandMount host OS’s folder to minikube VM
minikube mount /host-mount-path:/vm-mount-path

Folder of k8s.io/minikube-hostpath provisioner
/tmp/hostpath-provisioner, /tmp/hostpath_pv

Mount host OS’s folder to minikube VM
minikube mount /host-mount-path:/vm-mount-path

Critical minikube folder
/var/lib/localkube, /var/lib/docker, /data

Check minikube config in your host OS desktop
~/.minikube/machines/minikube/config.json

Minikube conf in local env
~/.minikube, ~/.kube

## 1.4 MINIKUBE ADVANCED
NameCommandInstall addon after creating minikube env
minikube addons enable heapster, kubectl top node

## 1.5 MINIKUBE CLI ONLINE HELP
> minikube version
minikube version: v0.31.0
> minikube --help
Minikube is a CLI tool that provisions and manages single-node Kubernetes clusters optimized for development workflows.

## 1.6 MORE RESOURCES
License: Code is licensed under MIT License.
https://github.com/kubernetes/minikube/tree/master/docs
Start up a single node Kubernetes cluster
minikube start --kubernetes-version=<version> --driver=<driver_name>

e.g.
minikube start --kubernetes-version=v1.18.0 --driver=docker
Minikube supports the following drivers:

docker, virtualbox, podman, vmwarefusion, kvm2, hyperkit, hyperv, vmware, parallels, none

| Command | Description |
| ------- | ----------- |
| `minikube start` | Starts (and installs if not exists yet) the minikube node on the VM. |
| `minikube stop` | Stops the minikube node on the VM. |
| `minikube status` | Get the status |
| `minikube delete` | Deletes the minikube node from the VM. |
| `minikube dashboard` | Opens the minikube Kubernetes dashboard in the browser. |
| `minikube addons list` | List available addons |
| `minikube addons enable metrics-server` | Enable an addon |
| `minikube addons disable metrics-server` | Disable an addon |
| `minikube service <service_name>` | Proxy to a cluster service |
