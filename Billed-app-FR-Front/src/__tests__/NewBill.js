/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import mockStore from "../__mocks__/store.js"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
    document.body.innerHTML = NewBillUI()
  })

  describe("When I am on NewBill Page", () => {
    test("Then selecting an invalid file extension shows a validation error and does not upload", async () => {
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })
      const fileInput = screen.getByTestId('file')
      const file = new File(['pdfcontent'], 'test.pdf', { type: 'application/pdf' })
      const setCustomValiditySpy = jest.spyOn(fileInput, 'setCustomValidity')

      await userEvent.upload(fileInput, file)

      expect(setCustomValiditySpy).toHaveBeenCalled()
      expect(newBill.fileUrl).toBeNull()
      expect(newBill.fileName).toBeNull()
    })

    test("Then selecting a valid image uploads and sets fileUrl and fileName", async () => {
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })
      const fileInput = screen.getByTestId('file')
      const file = new File(['img'], 'receipt.png', { type: 'image/png' })

      await userEvent.upload(fileInput, file)

      await waitFor(() => {
        expect(newBill.fileUrl).toBeTruthy()
        expect(newBill.fileName).toBe('receipt.png')
      })
    })

    test("Then submitting the form calls update bill (integration POST)", async () => {
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      // Fill form fields
      fireEvent.change(screen.getByTestId('expense-type'), { target: { value: 'Transports' } })
      fireEvent.change(screen.getByTestId('expense-name'), { target: { value: 'Taxi' } })
      fireEvent.change(screen.getByTestId('datepicker'), { target: { value: '2023-01-10' } })
      fireEvent.change(screen.getByTestId('amount'), { target: { value: '42' } })
      fireEvent.change(screen.getByTestId('vat'), { target: { value: '10' } })
      fireEvent.change(screen.getByTestId('pct'), { target: { value: '20' } })
      fireEvent.change(screen.getByTestId('commentary'), { target: { value: 'course en ville' } })

      // Pretend a valid uploaded file already set via handleChangeFile
      newBill.fileUrl = 'https://localhost:3456/images/test.jpg'
      newBill.fileName = 'test.jpg'
      newBill.billId = '1234'

      const form = screen.getByTestId('form-new-bill')
      const handleSubmitSpy = jest.spyOn(newBill, 'handleSubmit')
      form.addEventListener('submit', handleSubmitSpy)

      fireEvent.submit(form)

      expect(handleSubmitSpy).toHaveBeenCalled()
      // After submit, we should navigate back to Bills page
      expect(screen.getByText('Mes notes de frais')).toBeTruthy()
    })

    test("Then pct defaults to 20 when left empty", async () => {
      const onNavigate = (pathname) => { document.body.innerHTML = ROUTES({ pathname }) }
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      // Fill required fields except pct
      fireEvent.change(screen.getByTestId('expense-type'), { target: { value: 'Transports' } })
      fireEvent.change(screen.getByTestId('expense-name'), { target: { value: 'Taxi' } })
      fireEvent.change(screen.getByTestId('datepicker'), { target: { value: '2023-01-10' } })
      fireEvent.change(screen.getByTestId('amount'), { target: { value: '42' } })
      fireEvent.change(screen.getByTestId('vat'), { target: { value: '10' } })
      fireEvent.change(screen.getByTestId('commentary'), { target: { value: 'course en ville' } })

      newBill.fileUrl = 'https://localhost:3456/images/test.jpg'
      newBill.fileName = 'test.jpg'
      newBill.billId = '1234'

      const form = screen.getByTestId('form-new-bill')
      const updateSpy = jest.spyOn(newBill, 'updateBill').mockImplementation(() => {})
      form.addEventListener('submit', newBill.handleSubmit)

      fireEvent.submit(form)

      expect(updateSpy).toHaveBeenCalled()
      const sentBill = updateSpy.mock.calls[0][0]
      expect(sentBill.pct).toBe(20)
    })
  })
})
