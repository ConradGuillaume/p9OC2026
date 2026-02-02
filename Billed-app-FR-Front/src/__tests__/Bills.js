/**
 * @jest-environment jsdom
 */

import {screen, waitFor, fireEvent} from "@testing-library/dom"
import userEvent from '@testing-library/user-event'
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH} from "../constants/routes.js";
import {localStorageMock} from "../__mocks__/localStorage.js";
import Bills from "../containers/Bills.js"
import mockStore from "../__mocks__/store.js"

jest.mock("../app/store", () => mockStore)

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee'
      }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      // Then the bills icon is highlighted
      expect(windowIcon.classList.contains('active-icon')).toBe(true)

    })
    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then clicking on 'Nouvelle note de frais' navigates to NewBill", () => {
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))
      document.body.innerHTML = BillsUI({ data: bills })
      const billsContainer = new Bills({ document, onNavigate, store: null, localStorage: window.localStorage })
      const newBillBtn = screen.getByTestId('btn-new-bill')
      const handleClickNewBill = jest.fn(billsContainer.handleClickNewBill)
      newBillBtn.addEventListener('click', handleClickNewBill)
      userEvent.click(newBillBtn)
      expect(handleClickNewBill).toHaveBeenCalled()
      // Should render NewBill route content
      expect(screen.getByText('Envoyer une note de frais')).toBeTruthy()
    })

    test("Then clicking on eye icon shows the bill proof modal", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee' }))
      document.body.innerHTML = BillsUI({ data: bills })
      // Initialize container to bind click handlers
      // Mock bootstrap modal to avoid errors in jsdom
      $.fn.modal = jest.fn()
      new Bills({ document, onNavigate: () => {}, store: null, localStorage: window.localStorage })
      const eyes = screen.getAllByTestId('icon-eye')
      expect(eyes.length).toBeGreaterThan(0)
      userEvent.click(eyes[0])
      // Modal should contain an image after click
      const modal = document.getElementById('modaleFile')
      expect(modal).toBeTruthy()
      await waitFor(() => expect($("#modaleFile .modal-body img").length).toBe(1))
    })

    test("Then an invalid date from API is displayed as-is (fallback path)", async () => {
      const invalidDate = 'invalid-date'
      jest.spyOn(mockStore, 'bills')
        .mockImplementationOnce(() => ({
          list: () => Promise.resolve([{ id: 'x', date: invalidDate, status: 'pending', email: 'a@a', amount: 1, name: 'n', type: 't', fileUrl: '#', fileName: 'f' }])
        }))

      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const billsContainer = new Bills({ document, onNavigate: () => {}, store: mockStore, localStorage: window.localStorage })
      const data = await billsContainer.getBills()
      expect(data[0].date).toBe(invalidDate)
      document.body.innerHTML = BillsUI({ data })
      expect(screen.getByText(invalidDate)).toBeTruthy()
    })
  })
})

// Integration tests: GET Bills
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET and displays them", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      // Wait for table body to render
      await waitFor(() => screen.getByTestId('tbody'))
      // Expect rows rendered for mocked bills (4)
      const rows = screen.getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    test("fetches bills and fails with 404 message error", async () => {
      jest.spyOn(mockStore, 'bills')
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error('Erreur 404'))
      }))
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("fetches bills and fails with 500 message error", async () => {
      jest.spyOn(mockStore, 'bills')
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: 'a@a' }))
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()
      mockStore.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error('Erreur 500'))
      }))
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })
  })
})
