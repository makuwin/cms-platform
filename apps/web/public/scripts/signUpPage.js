(function () {
  const storageKey = 'novaCmsAuth';

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      const onReady = () => {
        document.removeEventListener('DOMContentLoaded', onReady);
        callback();
      };
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      callback();
    }
  };

  ready(() => {
    const form = document.querySelector('[data-sign-up-form]');
    const feedback = document.querySelector('[data-sign-up-feedback]');
    const submit = document.querySelector('[data-sign-up-submit]');

    if (!(form instanceof HTMLFormElement)) return;

    const apiBaseRaw = form.getAttribute('data-api-base') || '';
    const apiBase = apiBaseRaw.replace(/\/$/, '');
    const registerEndpoint = apiBase
      ? apiBase + '/api/auth/register'
      : '/api/auth/register';

    const setFeedback = (message, color) => {
      if (!(feedback instanceof HTMLElement)) return;
      feedback.style.color = color;
      feedback.textContent = message;
    };

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        password: String(formData.get('password') || ''),
        role: String(formData.get('role') || '').trim() || undefined,
      };

      if (!payload.email || !payload.password) {
        setFeedback('Email and password are required.', '#dc2626');
        return;
      }

      if (submit instanceof HTMLButtonElement) {
        submit.disabled = true;
      }
      setFeedback('Creating your account...', '#6366f1');

      fetch(registerEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
        .then((response) =>
          response.json().then((data) => {
            if (!response.ok) {
              const message =
                data && data.error
                  ? data.error
                  : 'Unable to sign up. Please try again.';
              throw new Error(message);
            }
            return data;
          }),
        )
        .then((data) => {
          const stored = {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            timestamp: Date.now(),
          };
          localStorage.setItem(storageKey, JSON.stringify(stored));
          setFeedback('Account created! Redirecting…', '#16a34a');
          setTimeout(() => {
            window.location.href = '/';
          }, 900);
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : 'Unexpected error. Please retry.';
          setFeedback(message, '#dc2626');
        })
        .finally(() => {
          if (submit instanceof HTMLButtonElement) {
            submit.disabled = false;
          }
        });
    });
  });
})();
