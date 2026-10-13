document.addEventListener("DOMContentLoaded", () => {
  const modalElement = document.getElementById("deletePostModal");
  const confirmButton = document.getElementById("confirmDeletePost");
  const toastElement = document.getElementById("deleteSuccessToast");

  if (!modalElement || !confirmButton || !toastElement) return;

  const toast = bootstrap.Toast.getOrCreateInstance(toastElement);
  const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

  confirmButton.addEventListener("click", () => {
    if (confirmButton.disabled) return;

    modalElement.addEventListener("hidden.bs.modal", () => toast.show(), {
      once: true,
    });

    modal.hide();
  });
});
