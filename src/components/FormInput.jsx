import './FormInput.css'

function FormInput({ label, type = 'text', placeholder, value, onChange, name, as = 'input', ...rest }) {
  return (
    <div className="form-field">
      {label && <label className="form-label" htmlFor={name}>{label}</label>}
      {as === 'textarea' ? (
        <textarea
          className="form-input form-textarea"
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...rest}
        />
      ) : (
        <input
          className="form-input"
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...rest}
        />
      )}
    </div>
  )
}

export default FormInput
