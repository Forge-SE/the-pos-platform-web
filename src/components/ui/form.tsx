import { forwardRef, type ReactNode, type Ref } from "react"
import {
  Form as FormikForm,
  FormikProvider,
  useFormik,
  type FormikHelpers,
  type FormikProps,
  type FormikValues,
} from "formik"
import type { AnySchema } from "yup"

interface FormProps<T extends FormikValues> {
  initialValues: T
  validationSchema: AnySchema
  onSubmit: (values: T, helpers: FormikHelpers<T>) => void | Promise<unknown>
  children: (formik: FormikProps<T>) => ReactNode
  className?: string
  id?: string
}

function FormComponent<T extends FormikValues>(
  {
    onSubmit,
    validationSchema,
    initialValues,
    className = "",
    children,
    id,
  }: FormProps<T>,
  ref: Ref<HTMLFormElement>
) {
  const formik = useFormik<T>({
    initialValues,
    validationSchema,
    onSubmit,
    validateOnBlur: true,
    validateOnChange: true,
    enableReinitialize: true,
  })

  return (
    <FormikProvider value={formik}>
      <FormikForm
        ref={ref}
        id={id}
        className={className}
        onSubmit={formik.handleSubmit}
        noValidate
      >
        {children(formik)}
      </FormikForm>
    </FormikProvider>
  )
}

const Form = forwardRef(FormComponent) as <T extends FormikValues>(
  props: FormProps<T> & { ref?: Ref<HTMLFormElement> }
) => ReactNode

export function fieldError<T extends FormikValues>(
  formik: FormikProps<T>,
  name: keyof T & string
) {
  const message = formik.errors[name]
  if (typeof message !== "string") return undefined
  if (formik.submitCount === 0 && !formik.touched[name]) return undefined
  return message
}

export default Form
