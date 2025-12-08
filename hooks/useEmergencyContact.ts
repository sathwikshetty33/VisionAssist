/**
 * Emergency Contact Hook
 * Manages emergency contacts, location sharing, and SOS calls
 */

import { useCallback, useState, useEffect } from 'react';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMERGENCY_CONTACTS_KEY = '@emergency_contacts';

export interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  isPrimary?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

export function useEmergencyContact() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState(false);

  /**
   * Load saved emergency contacts
   */
  useEffect(() => {
    loadContacts();
    checkLocationPermission();
  }, []);

  const loadContacts = async () => {
    try {
      const stored = await AsyncStorage.getItem(EMERGENCY_CONTACTS_KEY);
      if (stored) {
        setContacts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  /**
   * Request location permission
   */
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      setLocationPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting location:', error);
      return false;
    }
  };

  /**
   * Save emergency contacts
   */
  const saveContacts = async (newContacts: EmergencyContact[]) => {
    try {
      await AsyncStorage.setItem(EMERGENCY_CONTACTS_KEY, JSON.stringify(newContacts));
      setContacts(newContacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
    }
  };

  /**
   * Add an emergency contact
   */
  const addContact = async (contact: Omit<EmergencyContact, 'id'>): Promise<boolean> => {
    try {
      const newContact: EmergencyContact = {
        ...contact,
        id: Date.now().toString(),
      };
      const newContacts = [...contacts, newContact];
      await saveContacts(newContacts);
      return true;
    } catch (error) {
      console.error('Error adding contact:', error);
      return false;
    }
  };

  /**
   * Remove an emergency contact
   */
  const removeContact = async (id: string): Promise<boolean> => {
    try {
      const newContacts = contacts.filter((c) => c.id !== id);
      await saveContacts(newContacts);
      return true;
    } catch (error) {
      console.error('Error removing contact:', error);
      return false;
    }
  };

  /**
   * Set primary contact
   */
  const setPrimaryContact = async (id: string): Promise<boolean> => {
    try {
      const newContacts = contacts.map((c) => ({
        ...c,
        isPrimary: c.id === id,
      }));
      await saveContacts(newContacts);
      return true;
    } catch (error) {
      console.error('Error setting primary contact:', error);
      return false;
    }
  };

  /**
   * Get current location
   */
  const getLocation = async (): Promise<LocationData | null> => {
    setIsLoading(true);
    try {
      if (!locationPermission) {
        const granted = await requestLocationPermission();
        if (!granted) {
          setIsLoading(false);
          return null;
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
      };

      // Try to get address
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addresses.length > 0) {
          const addr = addresses[0];
          locationData.address = [
            addr.streetNumber,
            addr.street,
            addr.city,
            addr.region,
            addr.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Address lookup failed, continue without it
      }

      setCurrentLocation(locationData);
      setIsLoading(false);
      return locationData;
    } catch (error) {
      console.error('Error getting location:', error);
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Generate Google Maps link
   */
  const getLocationLink = (location: LocationData): string => {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  };

  /**
   * Send SOS SMS to all contacts
   */
  const sendSOSMessage = async (): Promise<boolean> => {
    try {
      if (contacts.length === 0) {
        console.log('No emergency contacts set');
        return false;
      }

      const isSmsAvailable = await SMS.isAvailableAsync();
      if (!isSmsAvailable) {
        console.log('SMS not available');
        return false;
      }

      const location = await getLocation();
      let message = '🚨 EMERGENCY SOS 🚨\n\nI need help! This is an emergency alert from VisionAssist app.';
      
      if (location) {
        message += `\n\nMy location:\n${location.address || 'Address unavailable'}\n\nGoogle Maps: ${getLocationLink(location)}`;
      }

      const phoneNumbers = contacts.map((c) => c.phoneNumber);
      
      await SMS.sendSMSAsync(phoneNumbers, message);
      return true;
    } catch (error) {
      console.error('Error sending SOS message:', error);
      return false;
    }
  };

  /**
   * Call primary or first emergency contact
   */
  const callEmergencyContact = async (): Promise<boolean> => {
    try {
      const primaryContact = contacts.find((c) => c.isPrimary) || contacts[0];
      
      if (!primaryContact) {
        console.log('No emergency contacts set');
        return false;
      }

      const phoneUrl = `tel:${primaryContact.phoneNumber}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error calling emergency contact:', error);
      return false;
    }
  };

  /**
   * Pick contact from device contacts
   */
  const pickFromContacts = async (): Promise<EmergencyContact | null> => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Contacts permission denied');
        return null;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      // Return the first contact with a phone number (for demo)
      // In a real app, you'd show a picker UI
      if (data.length > 0) {
        const contact = data.find((c) => c.phoneNumbers && c.phoneNumbers.length > 0);
        if (contact && contact.phoneNumbers) {
          return {
            id: contact.id || Date.now().toString(),
            name: contact.name || 'Unknown',
            phoneNumber: contact.phoneNumbers[0].number || '',
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error picking contact:', error);
      return null;
    }
  };

  return {
    contacts,
    currentLocation,
    isLoading,
    locationPermission,
    addContact,
    removeContact,
    setPrimaryContact,
    getLocation,
    getLocationLink,
    sendSOSMessage,
    callEmergencyContact,
    pickFromContacts,
    requestLocationPermission,
  };
}

export default useEmergencyContact;
