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
    const form = document.querySelector('[data-sign-in-form]');
    const feedback = document.querySelector('[data-sign-in-feedback]');
    const submit = document.querySelector('[data-sign-in-submit]');

    if (!(form instanceof HTMLFormElement)) return;

    const apiBaseRaw = form.getAttribute('data-api-base') || '';
    const apiBase = apiBaseRaw.replace(/\/$/, '');
    const loginEndpoint = apiBase ? apiBase + '/api/auth/login' : '/api/auth/login';

    const setFeedback = (message, color) => {
      if (!(feedback instanceof HTMLElement)) return;
      feedback.style.color = color;
      feedback.textContent = message;
    };

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const formData = new FormData(form);
      const payload = {
        email: String(formData.get('email') || '').trim(),
        password: String(formData.get('password') || ''),
      };

      if (!payload.email || !payload.password) {
        setFeedback('Email and password are required.', '#dc2626');
        return;
      }

      if (submit instanceof HTMLButtonElement) {
        submit.disabled = true;
      }
      setFeedback('Signing you in...', '#6366f1');

      fetch(loginEndpoint, {
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
                  : 'Unable to sign in. Please try again.';
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
          setFeedback('Signed in successfully. Redirecting…', '#16a34a');
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
