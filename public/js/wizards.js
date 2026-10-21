// Step Wizard & Modal Management Controller

export const WizardState = {
  emp: { current: 1, max: 3 },
  adv: { current: 1, max: 2 },
  pay: { current: 1, max: 2 },
  admin: { current: 1, max: 2 }
};

export function setWizardStep(wizardName, stepNum) {
  const wizard = WizardState[wizardName];
  if (!wizard) return;
  stepNum = Math.max(1, Math.min(stepNum, wizard.max));
  wizard.current = stepNum;

  // Update step indicators
  document.querySelectorAll(`.step-indicator[data-wizard="${wizardName}"]`).forEach(ind => {
    const target = parseInt(ind.getAttribute('data-step-target'), 10);
    ind.classList.remove('active', 'completed');
    if (target === stepNum) {
      ind.classList.add('active');
    } else if (target < stepNum) {
      ind.classList.add('completed');
    }
  });

  // Update step panes
  for (let i = 1; i <= wizard.max; i++) {
    const pane = document.getElementById(`${wizardName}Step${i}`);
    if (pane) {
      pane.classList.toggle('active', i === stepNum);
    }
  }

  // Scroll modal body smoothly to top on step switch
  const activePane = document.getElementById(`${wizardName}Step${stepNum}`);
  if (activePane) {
    const modalBody = activePane.closest('.modal-body');
    if (modalBody) modalBody.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update Prev / Next buttons
  const cap = wizardName.charAt(0).toUpperCase() + wizardName.slice(1);
  const btnPrev = document.getElementById(`btn${cap}PrevStep`);
  const btnNext = document.getElementById(`btn${cap}NextStep`);

  if (btnPrev) {
    btnPrev.style.display = stepNum > 1 ? 'inline-flex' : 'none';
  }

  if (btnNext) {
    if (stepNum === wizard.max) {
      btnNext.style.display = 'none';
    } else {
      btnNext.style.display = 'inline-flex';
      if (wizardName === 'emp') {
        btnNext.textContent = stepNum === 1 ? 'Next: Wage & Shifts ▶' : 'Next: Payment & Notes ▶';
      } else if (wizardName === 'adv') {
        btnNext.textContent = 'Next: Mode & Reason ▶';
      } else if (wizardName === 'pay') {
        btnNext.textContent = 'Next: Payment Details ▶';
      } else if (wizardName === 'admin') {
        btnNext.textContent = 'Next: Security ▶';
      } else {
        btnNext.textContent = 'Next ▶';
      }
    }
  }
}

export function validateStepPane(wizardName, stepNum) {
  const pane = document.getElementById(`${wizardName}Step${stepNum}`);
  if (!pane) return true;
  const inputs = pane.querySelectorAll('input, select, textarea');
  for (const input of inputs) {
    if (!input.checkValidity()) {
      input.reportValidity();
      return false;
    }
  }
  return true;
}

export function validateAllSteps(formElement, wizardName) {
  const wizard = WizardState[wizardName];
  if (!wizard) return true;

  for (let s = 1; s <= wizard.max; s++) {
    const pane = document.getElementById(`${wizardName}Step${s}`);
    if (!pane) continue;
    const inputs = pane.querySelectorAll('input, select, textarea');
    for (const input of inputs) {
      if (!input.checkValidity()) {
        setWizardStep(wizardName, s);
        input.reportValidity();
        input.focus();
        return false;
      }
    }
  }
  return true;
}

export function nextWizardStep(wizardName) {
  const wizard = WizardState[wizardName];
  if (!wizard) return;
  if (!validateStepPane(wizardName, wizard.current)) return;
  if (wizard.current < wizard.max) {
    setWizardStep(wizardName, wizard.current + 1);
  }
}

export function prevWizardStep(wizardName) {
  const wizard = WizardState[wizardName];
  if (!wizard) return;
  if (wizard.current > 1) {
    setWizardStep(wizardName, wizard.current - 1);
  }
}

// Modal Open / Close Helpers
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    if (id === 'modalEmployee') setWizardStep('emp', 1);
    if (id === 'modalAdvance') setWizardStep('adv', 1);
    if (id === 'modalPayment') setWizardStep('pay', 1);
    if (id === 'modalAdminProfile') setWizardStep('admin', 1);
    const body = el.querySelector('.modal-body');
    if (body) body.scrollTop = 0;
  }
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

export function initModalListeners() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(btn.getAttribute('data-close'));
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Step indicator direct clicking
  document.querySelectorAll('.step-indicator').forEach(ind => {
    ind.addEventListener('click', () => {
      const wizardName = ind.getAttribute('data-wizard');
      const targetStep = parseInt(ind.getAttribute('data-step-target'), 10);
      const wizard = WizardState[wizardName];
      if (wizard && targetStep < wizard.current) {
        setWizardStep(wizardName, targetStep);
      } else if (wizard && targetStep > wizard.current) {
        if (validateStepPane(wizardName, wizard.current)) {
          setWizardStep(wizardName, targetStep);
        }
      }
    });
  });

  // Attach Prev/Next buttons
  ['emp', 'adv', 'pay', 'admin'].forEach(w => {
    const cap = w.charAt(0).toUpperCase() + w.slice(1);
    document.getElementById(`btn${cap}NextStep`)?.addEventListener('click', () => nextWizardStep(w));
    document.getElementById(`btn${cap}PrevStep`)?.addEventListener('click', () => prevWizardStep(w));
  });
}
