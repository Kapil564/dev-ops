# Kubernetes Troubleshooting Exercises

This directory contains deliberately misconfigured Kubernetes manifests designed to test and demonstrate cluster debugging workflows.

---

## Scenario 1: `broken-image.yaml` (ImagePullBackOff / ErrImagePull)

### Manifest
[broken-image.yaml](file:///c:/Users/kapil/Desktop/space/session21-python/troubleshooting/broken-image.yaml)

### Symptoms
When applied to the cluster, the pod fails to start and enters `ImagePullBackOff` or `ErrImagePull`.

```bash
kubectl apply -f troubleshooting/broken-image.yaml
kubectl get pods -n taskboard -l app=broken-image
```

### Diagnosis
1. Inspect the pod status and events:
   ```bash
   kubectl describe pod -n taskboard -l app=broken-image
   ```
2. In the `Events` section at the bottom, notice:
   ```text
   Failed to pull image "ghcr.io/example/taskboard-backend:does-not-exist": rpc error: code = NotFound desc = failed to pull and unpack image
   Error: ImagePullBackOff
   ```

### Root Cause
The image reference `ghcr.io/example/taskboard-backend:does-not-exist` points to a non-existent repository and tag.

### Fix
Update the image reference to a valid, reachable container image (e.g. `ghcr.io/kapil564/taskboard-backend:latest`) or remove the deployment:
```bash
kubectl delete -f troubleshooting/broken-image.yaml
```

---

## Scenario 2: `broken-service.yaml` (Missing Endpoints / 502 Bad Gateway)

### Manifest
[broken-service.yaml](file:///c:/Users/kapil/Desktop/space/session21-python/troubleshooting/broken-service.yaml)

### Symptoms
The service is created successfully, but incoming traffic fails with connection refused or timeout:

```bash
kubectl apply -f troubleshooting/broken-service.yaml
kubectl get svc -n taskboard broken-service
```

### Diagnosis
1. Check if the Service has any backend Pod endpoints:
   ```bash
   kubectl get endpoints -n taskboard broken-service
   ```
   **Output:**
   ```text
   NAME             ENDPOINTS   AGE
   broken-service   <none>      20s
   ```
2. Describe the Service to inspect the selector:
   ```bash
   kubectl describe svc -n taskboard broken-service
   ```
   **Output:**
   `Selector: app=label-that-does-not-exist`

### Root Cause
The Service's `spec.selector` (`app: label-that-does-not-exist`) does not match the labels on any running Pods in the namespace. Kubernetes cannot route traffic without matching endpoints.

### Fix
Align the selector with the target workload labels (e.g. `app: taskboard-backend`), or clean up:
```bash
kubectl delete -f troubleshooting/broken-service.yaml
```
