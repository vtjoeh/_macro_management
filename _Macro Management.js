// Macro Management from the Cisco video device touch panel 
// let author = 'joehughe' + '@' + 'cisco.com' 
// license: MIT
// Github: https://github.com/vtjoeh/_macro_management


import xapi from 'xapi';

const PANEL_NAME = 'Macro Management';  // shows up on touch panel

const PANEL_ORDER = 1; 

const SORT_ALPHABETICAL = true;  // ignores case and sorts alphabetically 

const PANEL_ID = 'panel_id_macro_management'; // ID of the panel created. 

const NAME_MACRO_MANAGEMENT = _main_macro_name();  

let macros; // Used to store an array of Macro names and state

async function getMacros() {
  try {
    const macroList = await xapi.Command.Macros.Macro.Get();
    macros = macroList.Macro;

    if (SORT_ALPHABETICAL) {
      macros.sort(function (a, b) {
        var textA = a.Name.toLowerCase();
        var textB = b.Name.toLowerCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;;
      });
    }
    updatePanel(macros);
  }
  catch (error) {
    console.error(error);
  }
}

async function updatePanel(macros) {
  try {
    let rows = '';
    let startPanel = `
    <Extensions>
    <Version>1.10</Version>
    <Panel>
    <Order>${PANEL_ORDER}</Order>
    <PanelId>${PANEL_ID}</PanelId>
    <Origin>local</Origin>
    <Location>HomeScreenAndCallControls</Location>
    <Icon>Sliders</Icon>
    <Color>#CF7900</Color>
    <Name>${PANEL_NAME}</Name>
    <ActivityType>Custom</ActivityType>
      <ActivityType>Custom</ActivityType>
      <Page>
        <Name>${PANEL_NAME}</Name>
        `

    let endPanel = `
          <PageId>page_id_Macros_Management</PageId>
          <Options>hideRowNames=1</Options>
        </Page>
      </Panel>
    </Extensions>
  `

    macros.forEach((macro, index) => {

      let number = index + 1;

      let panelRow = `
       <Row>
        <Name>${macro.Name}</Name>
        <Widget>
          <WidgetId>widget_text_macro_${macro.id}</WidgetId>
          <Name>${number + ': ' + macro.Name}</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=left</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_toggle_macro_id_${index}</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
        `

      let panelRowMacroManagement = `
      <Row>
        <Name>${macro.Name}</Name>
        <Widget>
          <WidgetId>widget_text_macro_${macro.id}</WidgetId>
          <Name>${number + ': ' + macro.Name}</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=left</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_toggle_macro_management</WidgetId>
          <Name>-----</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      `

      if (NAME_MACRO_MANAGEMENT === macro.Name) {
        rows += panelRowMacroManagement;
      } else {
        rows += panelRow;
      }

    })

    let extension = startPanel + rows + endPanel;

    await xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: PANEL_ID }, extension);

    macros.forEach((macro, index) => {
      let setValue = 'Off';

      if (macro.Active === 'True') {
        setValue = 'On';
      }
      if (macro.Name !== NAME_MACRO_MANAGEMENT) {
        xapi.Command.UserInterface.Extensions.Widget.SetValue({ Value: setValue, WidgetId: `widget_toggle_macro_id_${index}` });
      }
    })

  } catch (error) {
    console.error(error);
  }

}

async function updateMacroPanel(macroIndex, actionValue) {
  let macroName = macros[macroIndex].Name
  try {
    if (actionValue === 'on') {
      await xapi.Command.Macros.Macro.Activate({ Name: macroName });
    } else {
      await xapi.Command.Macros.Macro.Deactivate({ Name: macroName });
    }
    xapi.Command.Macros.Runtime.Restart();
  }
  catch (error) {
    if (error.message === 'Max number of active macros reached.') {
      maximumMacrosMessage();
    }
  }
}

async function maximumMacrosMessage() {
  await xapi.Command.UserInterface.Message.Prompt.Display(
    {
      Duration: 15,
      FeedbackId: 'MaximumNumberOfActiveMacros',
      "Option.1": 'OK',
      Text: 'Maximum number of active macros reached',
      Title: 'Max Macros'
    });
  getMacros();
}

function listen() {

  xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
    let array;
    if ((array = /widget_toggle_macro_id_(\d+)/.exec(action.WidgetId)) !== null) {
      updateMacroPanel(array[1], action.Value);
    }
  });

  xapi.Event.Macros.Macro.on(macroActivate => {
    if (macroActivate.hasOwnProperty('Activated') || macroActivate.hasOwnProperty('Deactivated')) {
      getMacros();
    }
  });

  xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
    if (panel.PanelId === PANEL_ID) {
      getMacros();
    }
  });
}

getMacros();

listen();
