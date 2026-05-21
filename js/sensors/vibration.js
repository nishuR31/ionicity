import {
  Haptics,
  ImpactStyle
} from '@capacitor/haptics';

export async function lightVibrate(){

  await Haptics.impact({
    style:ImpactStyle.Light
  });

}

export async function heavyVibrate(){

  await Haptics.impact({
    style:ImpactStyle.Heavy
  });

}